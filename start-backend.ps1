$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot 'Backend')
$env:PORT = '8081'
$env:VALOR_OTP_DEV_MODE = 'true'
Write-Host 'Starting Valor backend on http://localhost:8081 ...' -ForegroundColor Cyan
Write-Host 'The local OTP will be printed in this terminal after password verification.' -ForegroundColor Yellow
mvn spring-boot:run