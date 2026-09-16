# Diagnose: what's wrong with the web app

Set-Location C:\AppSoft\vocabularyagent
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== 1. pnpm version ===" -ForegroundColor Cyan
pnpm --version

Write-Host ""
Write-Host "=== 2. node_modules check (workspace packages) ===" -ForegroundColor Cyan
foreach ($pkg in @('types','sdk-fsrs','sdk-llm','ui-kit')) {
    $dir = "packages\$pkg"
    $has = Test-Path "$dir\node_modules"
    $built = Test-Path "$dir\dist"
    Write-Host ("  {0,-12} node_modules={1} dist={2}" -f $pkg, $has, $built)
}

Write-Host ""
Write-Host "=== 3. pnpm list (top-level) ===" -ForegroundColor Cyan
pnpm list --depth=0 2>&1 | Select-String -Pattern "ERR|warn|error|@vocab-agent" | Select-Object -First 20

Write-Host ""
Write-Host "=== 4. Try running web dev (timeout 20s) ===" -ForegroundColor Cyan
$job = Start-Job -ScriptBlock {
    Set-Location C:\AppSoft\vocabularyagent
    pnpm --filter @vocab-agent/web dev 2>&1
}
Wait-Job $job -Timeout 20 | Out-Null
Stop-Job $job
$out = Receive-Job $job
Write-Host $out
Remove-Job $job

Write-Host ""
Write-Host "=== 5. Check if 5173 is now listening ===" -ForegroundColor Cyan
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State | Format-Table -AutoSize