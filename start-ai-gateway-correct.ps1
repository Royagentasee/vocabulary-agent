# start-ai-gateway-correct.ps1
# AI 网关 - 用绝对 DB 路径启动（重要！）

$ErrorActionPreference = 'Continue'

Write-Host "Stopping any existing AI gateway..." -ForegroundColor Yellow
Get-NetTCPConnection -State Listen -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object {
    try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
}
Start-Sleep -Seconds 2

Write-Host "Starting AI Gateway with ABSOLUTE DB path..." -ForegroundColor Cyan
Write-Host "  DB: C:\AppSoft\vocabularyagent\vocab_agent.db" -ForegroundColor White
Write-Host "  Port: 8000 (0.0.0.0)" -ForegroundColor White

# 用绝对路径的 DATABASE_URL
$env:DATABASE_URL = "sqlite:////C:/AppSoft/vocabularyagent/vocab_agent.db"

Set-Location C:\AppSoft\vocabularyagent\services\ai-gateway

# 创建日志目录
if (!(Test-Path C:\AppSoft\vocabularyagent\logs)) {
    New-Item -ItemType Directory -Path C:\AppSoft\vocabularyagent\logs -Force | Out-Null
}

Write-Host "Starting... (Ctrl+C to stop)" -ForegroundColor Green
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 2>&1 | Tee-Object C:\AppSoft\vocabularyagent\logs\ai-gateway.log