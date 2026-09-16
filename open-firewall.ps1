# open-firewall.ps1
# 开放 Vocabulary Agent 端口（需要管理员权限）

# 检查是否管理员
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must run as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    exit 1
}

Write-Host "Adding firewall rules for Vocabulary Agent..." -ForegroundColor Cyan

# Web (5173)
New-NetFirewallRule -DisplayName "Vocab Agent Web" `
    -Direction Inbound `
    -LocalPort 5173 `
    -Protocol TCP `
    -Action Allow `
    -Profile Any `
    -ErrorAction SilentlyContinue
Write-Host "  [OK] Port 5173 (Web)" -ForegroundColor Green

# AI Gateway (8000)
New-NetFirewallRule -DisplayName "Vocab Agent AI" `
    -Direction Inbound `
    -LocalPort 8000 `
    -Protocol TCP `
    -Action Allow `
    -Profile Any `
    -ErrorAction SilentlyContinue
Write-Host "  [OK] Port 8000 (AI)" -ForegroundColor Green

# Learn Service (3001)
New-NetFirewallRule -DisplayName "Vocab Agent Learn" `
    -Direction Inbound `
    -LocalPort 3001 `
    -Protocol TCP `
    -Action Allow `
    -Profile Any `
    -ErrorAction SilentlyContinue
Write-Host "  [OK] Port 3001 (Learn)" -ForegroundColor Green

Write-Host ""
Write-Host "Firewall rules added. Mobile devices can now connect." -ForegroundColor Green
Write-Host "Test from phone: http://YOUR_PC_IP:5173" -ForegroundColor Yellow