$ErrorActionPreference = 'Stop'
$backendRoot = Join-Path $PSScriptRoot 'Backend'
$listener = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
  $commandLine = [string]$process.CommandLine
  if ($commandLine -match 'com\.valor\.ValorBackendApplication|valor-admin-backend|spring-boot:run') {
    Stop-Process -Id $listener.OwningProcess -Force
    Start-Sleep -Milliseconds 500
  } else {
    throw "Port 8081 is occupied by an unrelated process. Stop it manually or choose another PORT."
  }
}
Set-Location $backendRoot
$env:PORT = '8081'
$env:VALOR_OTP_DEV_MODE = 'true'
Write-Host 'Starting Valor backend on http://localhost:8081 ...' -ForegroundColor Cyan
Write-Host 'The local OTP will be printed in this terminal after password verification.' -ForegroundColor Yellow
mvn spring-boot:run