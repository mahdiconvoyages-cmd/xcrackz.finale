# Build APK Flutter v2.6.0+6 avec tous les fixes synchronisation Expo
# Fixes appliqués:
# - Icon configuration (flutter_launcher_icons)
# - Dashboard profiles.credits (pas user_credits)
# - Revenue calcul: company_commission + bonus_amount
# - Driver name: profiles.full_name dans initState
# - Debug logs ajoutés partout

Write-Host "🚀 Build Flutter APK v2.6.0+6 avec fixes Expo sync" -ForegroundColor Cyan
Write-Host ""

$flutterPath = "C:\src\flutter\bin\flutter.bat"
$projectPath = "c:\Users\mahdi\Documents\Finality-okok\mobile_flutter\finality_app"

Set-Location $projectPath

Write-Host "📦 1. Flutter clean..." -ForegroundColor Yellow
& $flutterPath clean

Write-Host ""
Write-Host "📥 2. Flutter pub get..." -ForegroundColor Yellow
& $flutterPath pub get

Write-Host ""
Write-Host "🎨 3. Génération icons (flutter_launcher_icons)..." -ForegroundColor Yellow
& $flutterPath pub run flutter_launcher_icons:main

Write-Host ""
Write-Host "🔨 4. Build APK release..." -ForegroundColor Yellow
& $flutterPath build apk --release

Write-Host ""
Write-Host "✅ Build terminé!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 APK location:" -ForegroundColor Cyan
Write-Host "   $projectPath\build\app\outputs\flutter-apk\app-release.apk"
Write-Host ""
Write-Host "🧪 Pour tester:" -ForegroundColor Yellow
Write-Host "   1. adb uninstall com.finality.app"
Write-Host "   2. adb install build\app\outputs\flutter-apk\app-release.apk"
Write-Host "   3. adb logcat -s flutter (pour voir les logs debug)"
Write-Host ""
Write-Host "Fixes a verifier:" -ForegroundColor Magenta
Write-Host "   Logo XZ visible"
Write-Host "   Dashboard affiche bons chiffres"
Write-Host "   Nom convoyeur affiche dans inspection"
Write-Host "   Revenue = company_commission + bonus_amount"
