$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot 'Backend')
$env:PORT = '8081'
Write-Host 'Starting Valor backend on http://localhost:8081 ...' -ForegroundColor Cyan
mvn spring-boot:run
