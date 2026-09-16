# expand-dictionary.ps1
# 一键下载 + 导入 ECDICT 5000+ 词

$ErrorActionPreference = 'Continue'

Write-Host "=== Expand Dictionary to 5000+ ===" -ForegroundColor Cyan

Set-Location C:\AppSoft\vocabularyagent

# 1. 安装依赖
Write-Host "[1/3] Installing Python deps..." -ForegroundColor Yellow
python -m pip install -r tools\seed-data\requirements.txt 2>&1 | Select-Object -Last 3

# 2. 下载 ECDICT
Write-Host ""
Write-Host "[2/3] Downloading ECDICT (90MB, 2-5 min)..." -ForegroundColor Yellow
python tools\seed-data\download-simple.py

# 3. 导入数据库
Write-Host ""
Write-Host "[3/3] Importing to SQLite (1-3 min)..." -ForegroundColor Yellow
python tools\seed-data\import-only.py

# 4. 验证
Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan
python -c "import sqlite3; c=sqlite3.connect('vocab_agent.db'); print('Total words:', c.execute('SELECT COUNT(*) FROM words').fetchone()[0])"