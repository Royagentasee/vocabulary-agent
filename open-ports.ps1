# open-ports.ps1
# 开放 Vocabulary Agent 端口（需要管理员权限）

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Need admin. Right-click PowerShell -> Run as Administrator" -ForegroundColor Red
    Write-Host "Then run: .\open-ports.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "=== Opening Vocabulary Agent ports ===" -ForegroundColor Cyan

# Web (5173)
New-NetFirewallRule -DisplayName "Vocab Agent Web 5173" `
    -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Any `
    -ErrorAction SilentlyContinue
Write-Host "  [OK] Port 5173 (Web)" -ForegroundColor Green

# AI Gateway (8000)
New-NetFirewallRule -DisplayName "Vocab Agent AI 8000" `
    -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -Profile Any `
    -ErrorAction SilentlyContinue
Write-Host "  [OK] Port 8000 (AI)" -ForegroundColor Green

# Learn Service (3001)
New-NetFirewallRule -DisplayName "Vocab Agent Learn 3001" `
    -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -Profile Any `
    -ErrorAction SilentlyContinue
Write-Host "  [OK] Port 3001 (Learn)" -ForegroundColor Green

# Admin (5174)
New-NetFirewallRule -DisplayName "Vocab Agent Admin 5174" `
    -Direction Inbound -LocalPort 5174 -Protocol TCP -Action Allow -Profile Any `
    -ErrorAction SilentlyContinue
Write-Host "  [OK] Port 5174 (Admin)" -ForegroundColor Green

Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "Vocab*" } | Format-Table DisplayName, Enabled, Direction -AutoSize

Write-Host ""
Write-Host "=== Network Interfaces ===" -ForegroundColor Cyan
ipconfig | Select-String "IPv4"

Write-Host ""
Write-Host "Test from phone (same WiFi):" -ForegroundColor Yellow
Write-Host "  http://<PC_IP>:5173" -ForegroundColor White
Write-Host "  e.g. http://192.168.227.29:5173" -ForegroundColor White