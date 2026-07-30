@echo off
title FILZ - Servidor e Painel Admin
echo.
echo ========================================================
echo               INICIANDO PROJETO FILZ
echo ========================================================
echo.
echo 1. Abrindo o painel admin no seu navegador...
start http://localhost:8080/admin.html
echo.
echo 2. Iniciando o servidor local (mantenha esta janela aberta)...
echo    Para fechar o servidor, feche esta janela ou aperte Ctrl+C.
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
