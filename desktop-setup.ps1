<#
  Loom — one-time desktop toolchain setup (free, no accounts).
  Tauri needs a Rust compiler and the MSVC linker. Neither is on this machine yet.

  Run from an ELEVATED PowerShell (right-click → Run as administrator):
      Set-ExecutionPolicy -Scope Process Bypass -Force
      .\desktop-setup.ps1

  Everything lands on D:\dev so the nearly-full C: drive keeps its space.
  Takes 10–20 minutes depending on the connection; ~9 GB total.
#>

$ErrorActionPreference = 'Stop'
$root = 'D:\dev'

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Done($msg) { Write-Host "    $msg" -ForegroundColor Green }

New-Item -ItemType Directory -Force -Path $root | Out-Null

# ---------- 0. what we already have ----------
Step 'Checking prerequisites'
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'winget is missing. Install "App Installer" from the Microsoft Store, then re-run this script.'
}
Done 'winget available'

$webview = Get-ChildItem 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' -ErrorAction SilentlyContinue
if ($webview) { Done 'WebView2 runtime present (Windows ships it)' }
else {
    winget install -e --id Microsoft.EdgeWebView2Runtime --accept-package-agreements --accept-source-agreements
    Done 'WebView2 runtime installed'
}

# ---------- 1. C++ linker (needs admin) ----------
Step 'Installing Visual Studio Build Tools (C++ workload + Windows SDK)'
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if ((Test-Path $vswhere) -and (& $vswhere -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -latest -property installationPath)) {
    Done 'Already installed — skipping'
}
else {
    Write-Host '    ~6 GB. This window will look idle for a while; leave it alone.' -ForegroundColor Yellow
    winget install -e --id Microsoft.VisualStudio.2022.BuildTools `
        --override "--quiet --wait --norestart --installPath `"$root\BuildTools`" --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" `
        --accept-package-agreements --accept-source-agreements
    Done 'Build Tools installed'
}

# ---------- 2. Rust ----------
Step 'Installing Rust (minimal profile, MSVC host)'
if (Test-Path "$root\rustup\settings.toml") {
    Done 'Already installed — skipping'
}
else {
    [Environment]::SetEnvironmentVariable('RUSTUP_HOME', "$root\rustup", 'User')
    [Environment]::SetEnvironmentVariable('CARGO_HOME', "$root\cargo", 'User')
    $env:RUSTUP_HOME = "$root\rustup"
    $env:CARGO_HOME = "$root\cargo"

    $boot = Join-Path $env:TEMP 'rustup-init.exe'
    Invoke-WebRequest 'https://win.rustup.rs/x86_64' -OutFile $boot
    & $boot -y --default-toolchain stable-x86_64-pc-windows-msvc --profile minimal
    if ($LASTEXITCODE -ne 0) { throw "rustup-init exited with $LASTEXITCODE" }
    Done 'Rust installed'
}

# ---------- 3. keep the build cache off C: ----------
Step 'Pointing the build cache at D:'
[Environment]::SetEnvironmentVariable('CARGO_TARGET_DIR', "$root\cargo-target", 'User')
$profile = "$root\cargo\bin"
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$profile*") {
    [Environment]::SetEnvironmentVariable('Path', "$userPath;$profile", 'User')
}
$env:Path = "$env:Path;$profile"
Done "cargo, rustc and the target dir now live under $root"

# ---------- 4. verify ----------
Step 'Verifying'
& "$root\cargo\bin\cargo.exe" --version
& "$root\cargo\bin\rustc.exe" --version

Write-Host @"

Toolchain is ready.

  1. Close this window and open a NEW terminal (PATH only refreshes on launch).
  2. cd "$PSScriptRoot"
  3. npm run desktop:build

  Installers appear in src-tauri\target\release\bundle\
    nsis\  Loom_1.0.0_x64-setup.exe   <- the normal one to share
    msi\   Loom_1.0.0_x64_en-US.msi

  To try it with hot reload first:  npm run desktop:dev
"@ -ForegroundColor Green
