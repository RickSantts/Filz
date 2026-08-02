$port = 8080
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

# ── Load env vars from .dev.vars ──
$devVarsPath = Join-Path $root ".dev.vars"
if (Test-Path $devVarsPath) {
  Get-Content $devVarsPath | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.+)') {
      [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim())
    }
  }
}

# ── Load brand/email config from config.json ──
$script:cfg = $null
$cfgPath = Join-Path $root "config.json"
if (Test-Path $cfgPath) {
  try { $script:cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json } catch { $script:cfg = $null }
}

function New-EmailSignature {
  param($cfg)
  if (-not $cfg) { return "" }
  if (-not $cfg.email -or -not $cfg.email.signatureEnabled) { return "" }
  $b = $cfg.brand
  $e = $cfg.email
  $whatsappClean = ("" + $b.whatsapp) -replace '[^\d]', ''
  $sig = @"
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:26px;">
  <tr>
    <td style="border-top:1px solid #D9D4CC;padding-top:18px;">
      <p style="margin:0;font-size:14px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#111111;">$($b.name)</p>
      <p style="margin:4px 0 0;font-size:12px;color:#5E5A54;">$($b.tagline)</p>
      <p style="margin:12px 0 0;font-size:12px;color:#5E5A54;">
        <a href="$($b.instagram)" style="color:#B08D57;text-decoration:none;">$($b.instagramHandle)</a>
        &nbsp;·&nbsp;
        <a href="https://wa.me/$whatsappClean" style="color:#B08D57;text-decoration:none;">WhatsApp</a>
        &nbsp;·&nbsp;
        $($b.domain)
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#5E5A54;">
        <a href="mailto:$($b.email)" style="color:#B08D57;text-decoration:none;">$($b.email)</a>
      </p>
    </td>
  </tr>
</table>
<p style="font-size:11px;color:#8A857D;margin:16px 0 0;border-top:1px solid #F5F3EF;padding-top:12px;">$($e.signatureFooterNote)</p>
"@
  return $sig
}

# ── Local KV store (simulates Cloudflare KV) ──
$kvPath = Join-Path $root "_kv.json"
if (!(Test-Path $kvPath)) { Set-Content $kvPath '{}' -NoNewline }
function Get-KV {
  return (Get-Content $kvPath -Raw | ConvertFrom-Json)
}
function Set-KV($key, $value) {
  $kv = Get-KV
  if ($kv -is [PSCustomObject]) {
    $kv | Add-Member -Force -MemberType NoteProperty -Name $key -Value $value
  } else {
    $kv = @{}; $kv.$key = $value
  }
  $kv | ConvertTo-Json | Set-Content $kvPath -NoNewline
}

# ── Session store ──
$sessPath = Join-Path $root "_sessions.json"
if (!(Test-Path $sessPath)) { Set-Content $sessPath '{}' -NoNewline }
function Get-Sessions {
  return (Get-Content $sessPath -Raw | ConvertFrom-Json)
}
function Save-Sessions($s) {
  $s | ConvertTo-Json | Set-Content $sessPath -NoNewline
}

function Test-Authenticated($req) {
  $cookie = $req.Headers["Cookie"]
  $sid = ""
  if ($cookie -match '(?:^|;\s*)filz_session=([^;]+)') { $sid = $Matches[1] }
  if ([string]::IsNullOrEmpty($sid)) { return $false }
  $session = (Get-Sessions).$sid
  if (!$session) { return $false }
  $exp = [DateTime]::Parse($session.exp)
  return ($exp -ge [DateTime]::UtcNow)
}

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

    # GET /api/config
    if ($method -eq "GET" -and $path -eq "/api/config") {
      if ($script:cfg) {
        $json = $script:cfg | ConvertTo-Json -Depth 20
        WriteText $ctx 200 "application/json" $json
      } else {
        WriteText $ctx 404 "application/json" '{"error":"Config nao encontrado"}'
      }
      continue
    }

    # POST /api/save
    if ($method -eq "POST" -and $path -eq "/api/save") {
      if (!(Test-Authenticated $req)) {
        WriteText $ctx 401 "application/json" '{"ok":false,"message":"Nao autenticado"}'
        continue
      }
      $sr = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
      $body = $sr.ReadToEnd()
      $sr.Close()
      $cfgPath = Join-Path $root "config.json"
      try {
        $null = $body | ConvertFrom-Json
        [System.IO.File]::WriteAllText($cfgPath, $body, [System.Text.Encoding]::UTF8)
        $script:cfg = $body | ConvertFrom-Json
        WriteText $ctx 200 "application/json" '{"ok":true}'
        Write-Host "[SAVE] config.json salvo" -ForegroundColor Green
      } catch {
        WriteText $ctx 400 "application/json" '{"ok":false,"message":"JSON invalido"}'
      }
      continue
    }

    # POST /api/upload
    if ($method -eq "POST" -and $path -eq "/api/upload") {
      if (!(Test-Authenticated $req)) {
        WriteText $ctx 401 "application/json" '{"ok":false,"message":"Nao autenticado"}'
        continue
      }
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
                $jsonResponse = "{`"ok`":true,`"path`":`"media/$safeFilename`"}"
                WriteText $ctx 200 "application/json" $jsonResponse
                Write-Host "[UPLOAD] Imagem salva: media/$safeFilename" -ForegroundColor Green
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

          $cfg = $script:cfg
          $b = $cfg.brand
          $e = $cfg.email
          $from = "$($b.name) <$($b.email)>"
          $clientSubject = if ($e.welcomeSubject) { $e.welcomeSubject } else { "Bem-vindo à lista de espera da FILZ ✦" }
          $signatureHtml = New-EmailSignature $cfg
          $clientHtml = @"
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111111;line-height:1.6;padding:20px;">
  <h2 style="font-weight:300;font-size:24px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:20px;">$($b.name)</h2>
  <hr style="border:0;border-top:1px solid #D9D4CC;margin:20px 0;" />
  <p>Olá,</p>
  <p>Agradecemos o seu interesse na nossa marca. Você acabou de ser adicionado à lista de espera para o lançamento da nossa primeira coleção.</p>
  <p><strong>Menos excesso. Mais presença.</strong></p>
  <p>Avisaremos você em primeira mão assim que as primeiras peças estiverem disponíveis para compra no site.</p>
  $signatureHtml
</div>
"@

          $clientBody = @{
            from = $from
            to = $email
            subject = $clientSubject
            html = $clientHtml
          } | ConvertTo-Json -Compress
          
          $adminBody = @{
            from = $from
            to = $b.email
            subject = "Novo lead na lista de espera!"
            html = "<div style=`"font-family:sans-serif;padding:20px;`"><h3>Novo cadastro na lista de espera da $($b.name)</h3><p>E-mail do lead: <strong>$email</strong></p><p>Data/Hora: $((Get-Date).ToString('dd/MM/yyyy HH:mm'))</p></div>"
          } | ConvertTo-Json -Compress
          
          $headers = @{ "Authorization" = "Bearer $apiKey" }
          try {
            $null = Invoke-RestMethod -Uri "https://api.resend.com/emails" -Method POST -Headers $headers -ContentType "application/json; charset=utf-8" -Body $clientBody
            $null = Invoke-RestMethod -Uri "https://api.resend.com/emails" -Method POST -Headers $headers -ContentType "application/json; charset=utf-8" -Body $adminBody
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

    # ── POST /api/auth/login ──
    if ($method -eq "POST" -and $path -eq "/api/auth/login") {
      $sr = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
      $body = $sr.ReadToEnd(); $sr.Close()
      $data = $body | ConvertFrom-Json
      $password = $data.password

      if ([string]::IsNullOrEmpty($password)) {
        WriteText $ctx 400 "application/json" '{"ok":false,"message":"Digite a senha."}'
        continue
      }

      $valid = $false
      $kv = Get-KV
      if ($kv.admin_hash) {
        $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($password))
        $hashHex = [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()
        $valid = ($hashHex -eq $kv.admin_hash)
      }
      if (!$valid -and $env:ADMIN_PASSWORD) {
        $valid = ($password -eq $env:ADMIN_PASSWORD)
      }

      if ($valid) {
        $sid = [System.Guid]::NewGuid().ToString()
        $sessions = Get-Sessions
        $sessions | Add-Member -Force -MemberType NoteProperty -Name $sid -Value @{exp=([DateTime]::UtcNow.AddDays(1).ToString('o'))}
        Save-Sessions $sessions
        $ctx.Response.Headers.Add("Set-Cookie", "filz_session=$sid; HttpOnly; Path=/; Max-Age=86400")
        WriteText $ctx 200 "application/json" '{"ok":true}'
      } else {
        WriteText $ctx 401 "application/json" '{"ok":false,"message":"Senha incorreta"}'
      }
      continue
    }

    # ── GET /api/auth/check ──
    if ($method -eq "GET" -and $path -eq "/api/auth/check") {
      $cookie = $req.Headers["Cookie"]
      $sid = ""
      if ($cookie -match '(?:^|;\s*)filz_session=([^;]+)') { $sid = $Matches[1] }

      if ([string]::IsNullOrEmpty($sid)) {
        WriteText $ctx 401 "application/json" '{"ok":false}'
        continue
      }

      $sessions = Get-Sessions
      $session = $sessions.$sid
      if (!$session) {
        WriteText $ctx 401 "application/json" '{"ok":false}'
        continue
      }

      $exp = [DateTime]::Parse($session.exp)
      if ($exp -lt [DateTime]::UtcNow) {
        WriteText $ctx 401 "application/json" '{"ok":false}'
        continue
      }

      WriteText $ctx 200 "application/json" '{"ok":true,"role":"admin"}'
      continue
    }

    # ── POST /api/auth/logout ──
    if ($method -eq "POST" -and $path -eq "/api/auth/logout") {
      $cookie = $req.Headers["Cookie"]
      $sid = ""
      if ($cookie -match '(?:^|;\s*)filz_session=([^;]+)') { $sid = $Matches[1] }
      if (![string]::IsNullOrEmpty($sid)) {
        $sessions = Get-Sessions
        $sessions.PSObject.Properties.Remove($sid)
        Save-Sessions $sessions
      }
      $ctx.Response.Headers.Add("Set-Cookie", "filz_session=; HttpOnly; Path=/; Max-Age=0")
      WriteText $ctx 200 "application/json" '{"ok":true}'
      continue
    }

    # ── POST /api/auth/forgot-password ──
    if ($method -eq "POST" -and $path -eq "/api/auth/forgot-password") {
      $sr = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
      $body = $sr.ReadToEnd(); $sr.Close()

      $adminEmail = $env:ADMIN_EMAIL
      if ([string]::IsNullOrEmpty($adminEmail)) {
        WriteText $ctx 500 "application/json" '{"ok":false,"message":"ADMIN_EMAIL nao configurado"}'
        continue
      }

      $apiKey = $env:RESEND_API_KEY
      if (![string]::IsNullOrEmpty($apiKey)) {
        $pass = $env:ADMIN_PASSWORD
        $html = @"
<div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#111;padding:20px;">
<h2 style="font-weight:300;font-size:22px;letter-spacing:0.15em;text-transform:uppercase;">FILZ</h2>
<hr style="border:0;border-top:1px solid #D9D4CC;margin:20px 0;">
<p>Ola,</p>
<p>Alguem solicitou a recuperacao da senha do painel administrativo.</p>
<p style="background:#F5F3EF;padding:12px 16px;border-radius:6px;font-family:monospace;font-size:16px;letter-spacing:0.1em;">$pass</p>
<p>Se nao foi voce, ignore este e-mail.</p>
</div>
"@
        $emailBody = @{from = "FILZ Admin <contato@filz.com.br>"; to = $adminEmail; subject = "Recuperacao de senha - FILZ Admin"; html = $html}
        $emailJson = $emailBody | ConvertTo-Json -Compress
        try {
          $null = Invoke-RestMethod -Uri "https://api.resend.com/emails" -Method POST -Headers @{"Authorization" = "Bearer $apiKey"} -ContentType "application/json" -Body $emailJson
        } catch { Write-Host "[FORGOT ERRO] $($_.Exception.Message)" -ForegroundColor Red }
      } else {
        Write-Host "[FORGOT] RESEND_API_KEY nao configurada - senha atual: $($env:ADMIN_PASSWORD)" -ForegroundColor Yellow
      }

      WriteText $ctx 200 "application/json" '{"ok":true}'
      continue
    }

    # ── POST /api/auth/register ──
    if ($method -eq "POST" -and $path -eq "/api/auth/register") {
      $sr = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
      $body = $sr.ReadToEnd(); $sr.Close()
      $data = $body | ConvertFrom-Json
      $email = $data.email
      $password = $data.password

      if ([string]::IsNullOrEmpty($email) -or !$email.Contains("@")) {
        WriteText $ctx 400 "application/json" '{"ok":false,"message":"E-mail invalido"}'
        continue
      }
      if ([string]::IsNullOrEmpty($password) -or $password.Length -lt 6) {
        WriteText $ctx 400 "application/json" '{"ok":false,"message":"Senha deve ter no minimo 6 caracteres"}'
        continue
      }

      $kv = Get-KV
      if ($kv.admin_hash) {
        WriteText $ctx 409 "application/json" '{"ok":false,"message":"Ja existe uma conta cadastrada"}'
        continue
      }

      $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($password))
      $hashHex = [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()
      Set-KV "admin_email" $email
      Set-KV "admin_hash" $hashHex

      Write-Host "[REGISTER] Conta criada: $email" -ForegroundColor Green
      WriteText $ctx 200 "application/json" '{"ok":true}'
      continue
    }

    # ── GET /p/[id] (página de produto via SSR) ──
    if ($method -eq "GET" -and $path -like "/p/*") {
      $prodId = [System.Net.WebUtility]::UrlDecode($path.Substring(3).Trim("/"))
      $outFile = Join-Path $env:TEMP ("filz_p_" + [guid]::NewGuid().ToString("N") + ".html")
      $nodeScript = Join-Path $root "scripts\serve-product.mjs"
      & node $nodeScript $prodId $outFile 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0 -and (Test-Path $outFile)) {
        $bytes = [System.IO.File]::ReadAllBytes($outFile)
        Remove-Item $outFile -Force
        WriteBytes $ctx 200 "text/html; charset=utf-8" $bytes
      } else {
        if (Test-Path $outFile) { Remove-Item $outFile -Force }
        WriteText $ctx 404 "text/html" "<h1>404 Not Found</h1>"
      }
      continue
    }

    # Static files
    if ($path -eq "/" -or $path -eq "") { $path = "/index.html" }
    if ($path -eq "/admin") { $path = "/admin.html" }
    if ($path -like "/media/*") { $path = "/assets/images/" + ($path.Substring(7)) }

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