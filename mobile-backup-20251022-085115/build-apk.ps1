# Script pour builder l'APK depuis le dossier mobile
Write-Host "🔨 Building Android APK from mobile directory..." -ForegroundColor Cyan
Write-Host "📁 Current directory: $PWD" -ForegroundColor Yellow

# Vérifier qu'on est dans le bon répertoire
if (!(Test-Path ".\app.json")) {
    Write-Host "❌ Error: app.json not found! Are you in the mobile directory?" -ForegroundColor Red
    exit 1
}

# Vérifier le contenu de app.json
$appJson = Get-Content ".\app.json" | ConvertFrom-Json
Write-Host "📱 App Name: $($appJson.expo.name)" -ForegroundColor Green
Write-Host "📦 Package: $($appJson.expo.android.package)" -ForegroundColor Green
Write-Host "🏢 Owner: $($appJson.expo.owner)" -ForegroundColor Green
Write-Host "🆔 Project ID: $($appJson.expo.extra.eas.projectId)" -ForegroundColor Green

# Lancer le build
Write-Host "`n🚀 Starting EAS build..." -ForegroundColor Cyan
eas build --platform android --profile production
