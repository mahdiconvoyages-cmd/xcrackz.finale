# 🚀 BUILD APK + IPA SUR EAS CLOUD
# Script simplifié et fonctionnel

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🚀 BUILD APK + IPA SUR EAS CLOUD" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Aller dans le dossier mobile
Set-Location mobile

# Vérifier EAS CLI
Write-Host "`n📦 Vérification EAS CLI..." -ForegroundColor Yellow
try {
    $null = eas --version
    Write-Host "✅ EAS CLI déjà installé" -ForegroundColor Green
}
catch {
    Write-Host "📥 Installation EAS CLI..." -ForegroundColor Yellow
    npm install -g eas-cli
}

# Vérifier connexion
Write-Host "`n🔐 Vérification connexion..." -ForegroundColor Yellow
$whoami = eas whoami 2>&1 | Out-String
if ($whoami -match "Not logged in") {
    Write-Host "🔑 Connexion requise..." -ForegroundColor Yellow
    eas login
}
else {
    Write-Host "✅ Connecté" -ForegroundColor Green
}

# Menu
Write-Host "`n📱 Que voulez-vous builder ?" -ForegroundColor Cyan
Write-Host "1. Android APK" -ForegroundColor White
Write-Host "2. iOS IPA" -ForegroundColor White  
Write-Host "3. Android + iOS" -ForegroundColor White

$choice = Read-Host "`nChoix (1-3)"

# Build Android
if ($choice -eq "1" -or $choice -eq "3") {
    Write-Host "`n🤖 BUILD ANDROID APK..." -ForegroundColor Green
    Write-Host "⏳ Cela prend 10-15 minutes..." -ForegroundColor Yellow
    
    eas build --platform android --profile production
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ APK CRÉÉ !" -ForegroundColor Green
        Write-Host "📥 Télécharger sur https://expo.dev" -ForegroundColor Cyan
    }
}

# Build iOS  
if ($choice -eq "2" -or $choice -eq "3") {
    Write-Host "`n🍎 BUILD iOS IPA..." -ForegroundColor Green
    Write-Host "⚠️ Nécessite compte Apple Developer" -ForegroundColor Yellow
    Write-Host "⏳ Cela prend 15-20 minutes..." -ForegroundColor Yellow
    
    $confirm = Read-Host "Continuer ? (o/n)"
    if ($confirm -eq "o") {
        eas build --platform ios --profile production
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ IPA CRÉÉ !" -ForegroundColor Green
            Write-Host "📥 Télécharger sur https://expo.dev" -ForegroundColor Cyan
        }
    }
}

Write-Host "`n✅ TERMINÉ !" -ForegroundColor Green
Write-Host "📱 Télécharger sur: https://expo.dev" -ForegroundColor Cyan

Set-Location ..
