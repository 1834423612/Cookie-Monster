$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$extensionDir = Join-Path $repoRoot "extension"
$downloadsDir = Join-Path $repoRoot "public/downloads"
$defaultKeyPath = Join-Path $repoRoot ".secrets/chrome-extension.pem"
$keyPath = if ($env:COOKIE_MONSTER_EXTENSION_KEY) {
  $env:COOKIE_MONSTER_EXTENSION_KEY
} else {
  $defaultKeyPath
}

if (-not (Test-Path -LiteralPath $extensionDir)) {
  throw "Extension directory not found: $extensionDir"
}

if (-not (Test-Path -LiteralPath $keyPath)) {
  throw "Extension private key not found. Place it at '$defaultKeyPath' or set COOKIE_MONSTER_EXTENSION_KEY."
}

$chromeCandidates = @(
  $env:COOKIE_MONSTER_CHROME_PATH,
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "${env:LocalAppData}\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

if (-not $chromeCandidates.Count) {
  throw "Chrome executable not found. Set COOKIE_MONSTER_CHROME_PATH to chrome.exe."
}

$chromePath = $chromeCandidates[0]
$tempCrxPath = Join-Path $repoRoot "extension.crx"
$outputCrxPath = Join-Path $downloadsDir "cookie-monster-extension.crx"
$outputZipPath = Join-Path $downloadsDir "cookie-monster-extension.zip"

New-Item -ItemType Directory -Force -Path $downloadsDir | Out-Null

if (Test-Path -LiteralPath $tempCrxPath) {
  Remove-Item -LiteralPath $tempCrxPath -Force
}

if (Test-Path -LiteralPath $outputCrxPath) {
  Remove-Item -LiteralPath $outputCrxPath -Force
}

if (Test-Path -LiteralPath $outputZipPath) {
  Remove-Item -LiteralPath $outputZipPath -Force
}

$packArgs = @(
  "--pack-extension=$extensionDir"
  "--pack-extension-key=$keyPath"
)

$process = Start-Process -FilePath $chromePath -ArgumentList $packArgs -Wait -PassThru
if ($process.ExitCode -ne 0) {
  throw "Chrome pack-extension failed with exit code $($process.ExitCode)."
}

if (-not (Test-Path -LiteralPath $tempCrxPath)) {
  throw "Expected packed CRX was not created at $tempCrxPath."
}

Move-Item -LiteralPath $tempCrxPath -Destination $outputCrxPath -Force
Compress-Archive -Path (Join-Path $extensionDir "*") -DestinationPath $outputZipPath -Force

Write-Output "Packed CRX: $outputCrxPath"
Write-Output "Packed ZIP: $outputZipPath"
