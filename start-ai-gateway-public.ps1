# start-ai-gateway-public.ps1
# 启动 AI 网关（绑定 0.0.0.0 让手机可访问）

Set-Location C:\AppSoft\vocabularyagent\services\ai-gateway

$env:DATABASE_URL = "sqlite:///./vocab_agent.db"

Write-Host "Starting AI Gateway on 0.0.0.0:8000 (allows mobile access)..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload