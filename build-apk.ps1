# Script automatisé pour build APK Android avec EAS
# Usage: .\build-apk.ps1

Write-Host "🚀 FINALITY - BUILD APK ANDROID" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si on est dans le bon répertoire
$currentDir = Get-Location
if ($currentDir.Path -notlike "*Finality-okok*") {
    Write-Host "⚠️  ATTENTION: Vous n'êtes pas dans le dossier Finality-okok" -ForegroundColor Yellow
    Write-Host "Navigation vers le dossier mobile..." -ForegroundColor Yellow
    Set-Location "C:\Users\mahdi\Documents\Finality-okok\mobile"
}

# Aller dans le dossier mobile
if (-not (Test-Path ".\mobile")) {
    Write-Host "📁 Déjà dans le dossier mobile" -ForegroundColor Green
} else {
    Write-Host "📁 Navigation vers le dossier mobile..." -ForegroundColor Yellow
    Set-Location ".\mobile"
}

Write-Host ""

# Vérifier si EAS CLI est installé
Write-Host "🔍 Vérification de EAS CLI..." -ForegroundColor Yellow
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue

if (-not $easInstalled) {
    Write-Host "📦 Installation de EAS CLI..." -ForegroundColor Yellow
    npm install -g eas-cli
    Write-Host "✅ EAS CLI installé" -ForegroundColor Green
} else {
    Write-Host "✅ EAS CLI déjà installé" -ForegroundColor Green
}

Write-Host ""

# Vérifier si connecté à Expo
Write-Host "🔐 Vérification connexion Expo..." -ForegroundColor Yellow
$whoami = eas whoami 2>&1

if ($whoami -like "*Not logged in*" -or $whoami -like "*Erreur*") {
    Write-Host "🔑 Connexion à Expo requise..." -ForegroundColor Yellow
    Write-Host ""
    eas login
    Write-Host ""
} else {
    Write-Host "✅ Connecté à Expo: $whoami" -ForegroundColor Green
}

Write-Host ""

# Vérifier si eas.json existe
if (-not (Test-Path ".\eas.json")) {
    Write-Host "⚙️  Configuration EAS..." -ForegroundColor Yellow
    eas build:configure
    Write-Host "✅ Configuration EAS créée" -ForegroundColor Green
} else {
    Write-Host "✅ Configuration EAS existe" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🔨 LANCEMENT DU BUILD APK" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏱️  Durée estimée: 10-20 minutes" -ForegroundColor Yellow
Write-Host "📦 Type: APK (preview)" -ForegroundColor Yellow
Write-Host "🤖 Plateforme: Android" -ForegroundColor Yellow
Write-Host ""

# Demander confirmation
$confirmation = Read-Host "Voulez-vous continuer? (O/N)"

if ($confirmation -eq 'O' -or $confirmation -eq 'o' -or $confirmation -eq 'Y' -or $confirmation -eq 'y') {
    Write-Host ""
    Write-Host "🚀 Build en cours..." -ForegroundColor Green
    Write-Host ""
    
    # Lancer le build
    eas build --platform android --profile preview
    
    Write-Host ""
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "✅ BUILD TERMINÉ !" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📥 Téléchargez l'APK depuis le lien fourni ci-dessus" -ForegroundColor Yellow
    Write-Host "📱 Transférez l'APK sur votre téléphone Android" -ForegroundColor Yellow
    Write-Host "⚙️  Activez 'Sources inconnues' dans les paramètres" -ForegroundColor Yellow
    Write-Host "🎉 Installez l'APK sur votre appareil" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Build annulé" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
