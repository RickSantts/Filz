$port = 8080
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host ""
Write-Host "========================================" -ForegroundColor Gray
Write-Host "  FILZ - Servidor Iniciado" -ForegroundColor Green
Write-Host "  Site:   http://localhost:$port" -ForegroundColor Cyan
Write-Host "  Admin:  http://localhost:$port/admin.html" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Gray
Write-Host "  Para fechar o servidor, feche esta janela." -ForegroundColor Gray
Write-Host ""

$mime = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".js" = "application/javascript; charset=utf-8"; ".json" = "application/json; charset=utf-8"
  ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".png" = "image/png"
  ".svg" = "image/svg+xml"; ".ico" = "image/x-icon"; ".webp" = "image/webp"
}

function WriteBytes($ctx, $code, $ct, $bytes) {
  $ctx.Response.StatusCode = $code
  $ctx.Response.ContentType = $ct
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.OutputStream.Close()
}

function WriteText($ctx, $code, $ct, $txt) {
  $b = [System.Text.Encoding]::UTF8.GetBytes($txt)
  WriteBytes $ctx $code $ct $b
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $method = $req.HttpMethod
    $path = $req.Url.LocalPath

    $ctx.Response.Headers["Access-Control-Allow-Origin"] = "*"

    if ($method -eq "OPTIONS") {
      $ctx.Response.StatusCode = 200
      $ctx.Response.OutputStream.Close()
      continue
    }

    # POST /api/save
    if ($method -eq "POST" -and $path -eq "/api/save") {
      $sr = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
      $body = $sr.ReadToEnd()
      $sr.Close()
      $cfgPath = Join-Path $root "config.json"
      try {
        $null = $body | ConvertFrom-Json
        [System.IO.File]::WriteAllText($cfgPath, $body, [System.Text.Encoding]::UTF8)
        WriteText $ctx 200 "application/json" '{"ok":true}'
        Write-Host "[SAVE] config.json salvo" -ForegroundColor Green
      } catch {
        WriteText $ctx 400 "application/json" '{"ok":false,"message":"JSON invalido"}'
      }
      continue
    }

    # POST /api/upload
    if ($method -eq "POST" -and $path -eq "/api/upload") {
      try {
        $contentType = $req.ContentType
        $boundary = ""
        if ($contentType -match 'boundary=(?:"([^"]+)"|([^;]+))') {
          if ($Matches[1]) {
            $boundary = $Matches[1]
          } else {
            $boundary = $Matches[2].Trim()
          }
        }

        if ([string]::IsNullOrEmpty($boundary)) {
          WriteText $ctx 400 "application/json" '{"ok":false,"message":"Boundary nao encontrado"}'
          continue
        }

        $len = $req.ContentLength64
        $buffer = New-Object byte[] $len
        $read = 0
        while ($read -lt $len) {
          $read += $req.InputStream.Read($buffer, $read, $len - $read)
        }

        # Use codepage 28591 (Latin1) to map bytes 1-to-1 to characters
        $encoding = [System.Text.Encoding]::GetEncoding(28591)
        $rawString = $encoding.GetString($buffer)

        $boundaryIndex = $rawString.IndexOf("--$boundary")
        if ($boundaryIndex -ge 0) {
          $filenameMatch = [regex]::Match($rawString, 'filename="([^"]+)"')
          if ($filenameMatch.Success) {
            $filename = $filenameMatch.Groups[1].Value
            $safeFilename = [System.IO.Path]::GetFileName($filename)
            
            $partStartIndex = $rawString.IndexOf("`r`n`r`n", $boundaryIndex)
            if ($partStartIndex -ge 0) {
              $partStartIndex += 4
              $nextBoundaryIndex = $rawString.IndexOf("--$boundary", $partStartIndex)
              
              if ($nextBoundaryIndex -gt $partStartIndex) {
                $fileLength = $nextBoundaryIndex - $partStartIndex - 2
                $fileBytes = New-Object byte[] $fileLength
                [System.Array]::Copy($buffer, $partStartIndex, $fileBytes, 0, $fileLength)
                
                $destDir = Join-Path $root "assets\images"
                if (!(Test-Path $destDir)) {
                  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
                }
                
                $destPath = Join-Path $destDir $safeFilename
                [System.IO.File]::WriteAllBytes($destPath, $fileBytes)
                
                # Double quote escaping in PowerShell string to avoid parsing errors
                $jsonResponse = "{`"ok`":true,`"path`":`"assets/images/$safeFilename`"}"
                WriteText $ctx 200 "application/json" $jsonResponse
                Write-Host "[UPLOAD] Imagem salva: assets/images/$safeFilename" -ForegroundColor Green
                continue
              }
            }
          }
        }
        WriteText $ctx 400 "application/json" '{"ok":false,"message":"Estrutura multipart invalida"}'
      } catch {
        # Safe string formatting for exception message without complex quoting
        $err = $_.Exception.Message
        $cleanErr = $err -replace '"', '\"'
        WriteText $ctx 500 "application/json" "{`"ok`":false,`"message`":`"$cleanErr`"}"
        Write-Host "[ERRO UPLOAD] $err" -ForegroundColor Red
      }
      continue
    }
    # POST /api/waitlist
    if ($method -eq "POST" -and $path -eq "/api/waitlist") {
      try {
        $sr = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
        $body = $sr.ReadToEnd()
        $sr.Close()
        
        $data = $body | ConvertFrom-Json
        $email = $data.email
        
        if ([string]::IsNullOrEmpty($email) -or !$email.Contains("@")) {
          WriteText $ctx 400 "application/json" '{"ok":false,"message":"E-mail invalido"}'
          continue
        }
        
        Write-Host "[WAITLIST] Novo cadastro recebido: $email" -ForegroundColor Cyan
        
        # Optional local SMTP / API calling if API key is present
        $apiKey = $env:RESEND_API_KEY
        if (![string]::IsNullOrEmpty($apiKey)) {
          Write-Host "[WAITLIST] Enviando e-mails via Resend..." -ForegroundColor Gray
          $clientBody = @{
            from = "FILZ <contato@filz.com.br>"
            to = $email
            subject = "Bem-vindo a lista de espera da FILZ"
            html = "<h3>FILZ</h3><p>Bem-vindo a lista de espera! Avisaremos assim que a colecao for lancada.</p>"
          } | ConvertTo-Json -Compress
          
          $adminBody = @{
            from = "FILZ <contato@filz.com.br>"
            to = "contato@filz.com.br"
            subject = "Novo lead na lista de espera!"
            html = "<p>Email: $email</p>"
          } | ConvertTo-Json -Compress
          
          $headers = @{ "Authorization" = "Bearer $apiKey" }
          try {
            $null = Invoke-RestMethod -Uri "https://api.resend.com/emails" -Method POST -Headers $headers -ContentType "application/json" -Body $clientBody
            $null = Invoke-RestMethod -Uri "https://api.resend.com/emails" -Method POST -Headers $headers -ContentType "application/json" -Body $adminBody
            Write-Host "[WAITLIST] E-mails de teste enviados." -ForegroundColor Green
          } catch {
            Write-Host "[WAITLIST ERRO] $($_.Exception.Message)" -ForegroundColor Red
          }
        } else {
          Write-Host "[WAITLIST] Nota: Para enviar e-mails reais no teste local, defina a variavel `$env:RESEND_API_KEY" -ForegroundColor Yellow
        }
        
        WriteText $ctx 200 "application/json" '{"ok":true}'
      } catch {
        WriteText $ctx 500 "application/json" '{"ok":false}'
      }
      continue
    }

    # Static files
    if ($path -eq "/" -or $path -eq "") { $path = "/index.html" }
    if ($path -eq "/admin") { $path = "/admin.html" }

    $filePath = Join-Path $root ($path.TrimStart("/").Replace("/", "\"))
    if (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $ct = if ($mime[$ext]) { $mime[$ext] } else { "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      WriteBytes $ctx 200 $ct $bytes
    } else {
      WriteText $ctx 404 "text/html" "<h1>404 Not Found</h1>"
    }
  } catch {
    Write-Host "[ERRO] $($_.Exception.Message)"
    try { $ctx.Response.OutputStream.Close() } catch { }
  }
}