# start-ai-gateway-bg.ps1
# Background start with absolute DB path

$env:DATABASE_URL = "sqlite:////C:/AppSoft/vocabularyagent/vocab_agent.db"

$proc = Start-Process -FilePath "C:\Python314\python.exe" `
  -ArgumentList "-m","uvicorn","app.main:app","--host","0.0.0.0","--port","8000" `
  -WorkingDirectory "C:\AppSoft\vocabularyagent\services\ai-gateway" `
  -WindowStyle Hidden `
  -RedirectStandardOutput "C:\AppSoft\vocabularyagent\logs\ai-gateway.log" `
  -RedirectStandardError "C:\AppSoft\vocabularyagent\logs\ai-gateway.err"

Write-Host "Started PID $proc.Id"
Write-Host "Log: C:\AppSoft\vocabularyagent\logs\ai-gateway.log"