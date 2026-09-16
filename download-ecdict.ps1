# download-ecdict.ps1
# Download ECDICT with multiple mirrors

$ErrorActionPreference = 'Continue'

$targetDir = 'C:\AppSoft\vocabularyagent\tools\seed-data\data'
$target = Join-Path $targetDir 'ecdict.csv'

if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

if ((Test-Path $target) -and ((Get-Item $target).Length -gt 50000000)) {
    Write-Host ('Already exists: ' + $target) -ForegroundColor Green
    exit 0
}

# Mirror list
$urls = @(
    'https://gh-proxy.com/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
    'https://mirror.ghproxy.com/https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv',
    'https://cdn.jsdelivr.net/gh/skywind3000/ECDICT@master/ecdict.csv',
    'https://raw.gitmirror.com/skywind3000/ECDICT/master/ecdict.csv',
    'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv'
)

foreach ($url in $urls) {
    $shortUrl = $url.Substring(0, [Math]::Min(70, $url.Length))
    Write-Host ('Trying: ' + $shortUrl + '...') -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $url -OutFile $target -TimeoutSec 180 -ErrorAction Stop
        $size = (Get-Item $target).Length
        if ($size -gt 50000000) {
            $mb = [math]::Round($size / 1MB, 1)
            Write-Host ('Downloaded: ' + $mb + ' MB') -ForegroundColor Green
            exit 0
        } else {
            Write-Host ('File too small: ' + $size + ' bytes') -ForegroundColor Yellow
        }
    } catch {
        Write-Host ('Failed: ' + $_.Exception.Message) -ForegroundColor Red
    }
}

Write-Host ''
Write-Host 'All mirrors failed. Manual download:' -ForegroundColor Red
Write-Host '  1. Open browser: https://cdn.jsdelivr.net/gh/skywind3000/ECDICT@master/ecdict.csv' -ForegroundColor Yellow
Write-Host ('  2. Save to: ' + $target) -ForegroundColor Yellow
exit 1