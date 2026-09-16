# ============================================
# Vocabulary Agent - One-click bootstrap (PowerShell)
# Usage: right-click -> "Run with PowerShell" or:
#        powershell -ExecutionPolicy Bypass -File .\setup.ps1
# ============================================

# Force UTF-8 output so non-ASCII characters render correctly
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ErrorActionPreference = 'Continue'

# 1. Switch to project root
Set-Location -Path C:\AppSoft\vocabularyagent
Write-Host "==> CWD: $(Get-Location)" -ForegroundColor Cyan

# 2. Check required tools
Write-Host ""
Write-Host "==> Checking tools..." -ForegroundColor Cyan
$tools = @{
    'docker'         = 'docker --version'
    'docker compose' = 'docker compose version'
    'pnpm'           = 'pnpm --version'
    'python'         = 'python --version'
    'node'           = 'node --version'
}
$missing = @()
foreach ($k in $tools.Keys) {
    try {
        $v = & { Invoke-Expression $tools[$k] } 2>$null
        if ($v) {
            Write-Host ("  [OK]   {0,-14} : {1}" -f $k, $v) -ForegroundColor Green
        } else {
            Write-Host ("  [MISS] {0}" -f $k) -ForegroundColor Red
            $missing += $k
        }
    } catch {
        Write-Host ("  [MISS] {0}" -f $k) -ForegroundColor Red
        $missing += $k
    }
}

# Check whether we have a working Docker daemon
$dockerAvailable = $false
if ($missing -notcontains 'docker' -and $missing -notcontains 'docker compose') {
    try {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $dockerAvailable = $true }
    } catch {}
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host ("!! Missing tools: {0}" -f ($missing -join ', ')) -ForegroundColor Yellow
    if ($missing -contains 'docker' -or $missing -contains 'docker compose') {
        Write-Host "   - Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        Write-Host "     (only needed for full docker-compose mode; SQLite fallback works without it)" -ForegroundColor Yellow
    }
    if ($missing -contains 'pnpm' -or $missing -contains 'node') {
        Write-Host "   - Node.js 20+ : https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "   - pnpm        : npm install -g pnpm" -ForegroundColor Yellow
        return
    }
    Write-Host ""
}

# 3. Prepare .env
Write-Host ""
Write-Host "==> Preparing .env ..." -ForegroundColor Cyan
$envExample = "services\ai-gateway\.env.example"
$envFile    = "services\ai-gateway\.env"
if (Test-Path $envExample) {
    if (-not (Test-Path $envFile)) {
        Copy-Item $envExample $envFile
        Write-Host ("  [NEW] {0}" -f $envFile) -ForegroundColor Green
        Write-Host "  *** Please edit the file and fill DEEPSEEK_API_KEY=sk-..." -ForegroundColor Yellow
    } else {
        Write-Host ("  [OK]  {0}" -f $envFile) -ForegroundColor Green
    }
} else {
    Write-Host ("  [MISS] {0}" -f $envExample) -ForegroundColor Red
}

# 4. Choose backend: Docker (Postgres) or local (SQLite)
$useDocker = $dockerAvailable
if ($useDocker) {
    Write-Host ""
    Write-Host "==> Starting docker compose (postgres + redis + ai-gateway) ..." -ForegroundColor Cyan
    try {
        docker compose up -d postgres redis ai-gateway
    } catch {
        Write-Host "  docker compose failed, falling back to local SQLite + uvicorn" -ForegroundColor Yellow
        $useDocker = $false
    }
    if ($useDocker) {
        Write-Host ""
        Write-Host "==> Waiting for Postgres ..." -ForegroundColor Cyan
        $ready = $false
        for ($i = 0; $i -lt 30; $i++) {
            try {
                docker compose exec -T postgres pg_isready -U vocab -d vocab_agent 2>$null | Out-Null
                if ($LASTEXITCODE -eq 0) { $ready = $true; break }
            } catch {}
            Start-Sleep -Seconds 2
        }
        if ($ready) {
            Write-Host "  [OK] Postgres is ready" -ForegroundColor Green
        } else {
            Write-Host "  [TIMEOUT] Postgres not ready in 60s, falling back to SQLite" -ForegroundColor Yellow
            $useDocker = $false
        }
    }
}

if (-not $useDocker) {
    Write-Host ""
    Write-Host "==> Using local SQLite fallback (no Docker)" -ForegroundColor Cyan
    # Remove any leftover DATABASE_URL so seed defaults to SQLite
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}

# 5. Install seed dependencies + import data
Write-Host ""
Write-Host "==> Installing seed dependencies ..." -ForegroundColor Cyan
try {
    python -m pip install -r tools\seed-data\requirements.txt
    if ($LASTEXITCODE -ne 0) { throw "pip install exit code: $LASTEXITCODE" }
} catch {
    Write-Host "  pip install failed. Check Python and requirements.txt" -ForegroundColor Red
    Write-Host "    $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "==> Importing seed data (ECDICT + GRE core) ..." -ForegroundColor Cyan
try {
    python -m tools.seed-data.seed 2>&1 | Out-Null
    Write-Host "  [OK] Seed import done" -ForegroundColor Green
} catch {
    Write-Host "  seed import failed" -ForegroundColor Red
}

# 6. Install ai-gateway deps (only needed if not running in Docker)
if (-not $useDocker) {
    Write-Host ""
    Write-Host "==> Installing AI gateway dependencies ..." -ForegroundColor Cyan
    # Install runtime deps (skip the relative-path editable lines)
    $reqFile = "services\ai-gateway\requirements.txt"
    $runtimeReqs = Get-Content $reqFile | Where-Object { $_ -notmatch '^\s*-e\s' -and $_ -notmatch '^\s*#' -and $_.Trim() -ne '' }
    try {
        python -m pip install $runtimeReqs
        if ($LASTEXITCODE -ne 0) { throw "pip install exit code: $LASTEXITCODE" }
    } catch {
        Write-Host "  pip install failed for runtime deps" -ForegroundColor Red
        Write-Host "    $_" -ForegroundColor Red
    }
    # Install local SDKs with absolute paths (Windows-friendly)
    try {
        python -m pip install -e (Resolve-Path "packages\sdk-llm-py").Path
        if ($LASTEXITCODE -ne 0) { throw "sdk-llm-py install exit code: $LASTEXITCODE" }
        python -m pip install -e (Resolve-Path "packages\sdk-fsrs-py").Path
        if ($LASTEXITCODE -ne 0) { throw "sdk-fsrs-py install exit code: $LASTEXITCODE" }
        Write-Host "  [OK] AI gateway deps + local SDKs installed" -ForegroundColor Green
    } catch {
        Write-Host "  Local SDK install failed" -ForegroundColor Red
        Write-Host "    $_" -ForegroundColor Red
    }
}

# 7. Install web deps
Write-Host ""
Write-Host "==> Installing web dependencies (pnpm install) ..." -ForegroundColor Cyan
try {
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install exit code: $LASTEXITCODE" }
    Write-Host "  [OK] Web deps installed" -ForegroundColor Green
} catch {
    Write-Host "  pnpm install failed. Install pnpm first: npm install -g pnpm" -ForegroundColor Red
    Write-Host "    $_" -ForegroundColor Red
    return
}

# 8. Print "what to do next" instructions
Write-Host ""
Write-Host "==> Bootstrap complete" -ForegroundColor Green
Write-Host ""
Write-Host "Detailed start guide: docs\dev-runbook.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick start (open two PowerShell windows):" -ForegroundColor Cyan
Write-Host ""
if ($useDocker) {
    Write-Host "  # Window A: AI gateway is already running in Docker (http://localhost:8000)" -ForegroundColor White
} else {
    Write-Host "  # Window A: AI gateway" -ForegroundColor White
    Write-Host "  cd C:\AppSoft\vocabularyagent\services\ai-gateway" -ForegroundColor White
    Write-Host "  python -m uvicorn app.main:app --reload --port 8000" -ForegroundColor White
}
Write-Host ""
Write-Host "  # Window B: web app" -ForegroundColor White
Write-Host "  cd C:\AppSoft\vocabularyagent" -ForegroundColor White
Write-Host "  pnpm --filter @vocab-agent/web dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open http://localhost:5173" -ForegroundColor Green
