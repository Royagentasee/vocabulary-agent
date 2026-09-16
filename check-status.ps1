# check-status.ps1
# Check Vocabulary Agent service status

Write-Host "=== Vocabulary Agent Status Check ===" -ForegroundColor Cyan
Write-Host ""

# Web
try {
    $r = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 2
    Write-Host ("  Web:           OK (HTTP " + $r.StatusCode + ")") -ForegroundColor Green
} catch {
    Write-Host "  Web:           Not running on 5173" -ForegroundColor Red
}

# AI Gateway
try {
    $r = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2
    $body = $r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
    Write-Host ("  AI Gateway:    OK (HTTP " + $r.StatusCode + " - " + $body.status + ")") -ForegroundColor Green
} catch {
    Write-Host "  AI Gateway:    Not running on 8000" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== URLs ===" -ForegroundColor Cyan
Write-Host "  Web:        http://localhost:5173" -ForegroundColor White
Write-Host "  AI Gateway: http://localhost:8000/health" -ForegroundColor White
Write-Host "  API Docs:   http://localhost:8000/docs" -ForegroundColor White