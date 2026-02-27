# build-pwa.ps1
# Builds the Flutter app for web and copies the output to pwa/ for Vercel deployment.
# Run from the workspace root: .\build-pwa.ps1

$ErrorActionPreference = 'Stop'
$flutterProjectPath = "mobile_flutter\finality_app"
$buildOutput = "$flutterProjectPath\build\web"
$pwaDir = "pwa"

Write-Host "==> Building Flutter web (release, PWA offline-first)..." -ForegroundColor Cyan
Set-Location $flutterProjectPath
flutter build web --release --pwa-strategy=offline-first --base-href /
Set-Location ..\..

Write-Host "==> Copying build output to $pwaDir\" -ForegroundColor Cyan

# Remove old files (except vercel.json)
Get-ChildItem $pwaDir -Exclude "vercel.json" | Remove-Item -Recurse -Force

# Copy new build
Copy-Item "$buildOutput\*" $pwaDir -Recurse -Force

Write-Host "==> Done! pwa/ is ready for Vercel deployment." -ForegroundColor Green
Write-Host ""
Write-Host "To deploy to app.checksfleet.com:" -ForegroundColor Yellow
Write-Host "  1. Go to vercel.com > New Project" -ForegroundColor Yellow
Write-Host "  2. Import this repository, set root directory to 'pwa'" -ForegroundColor Yellow
Write-Host "  3. Add domain: app.checksfleet.com" -ForegroundColor Yellow
Write-Host "  OR run: vercel --cwd pwa --prod" -ForegroundColor Yellow
