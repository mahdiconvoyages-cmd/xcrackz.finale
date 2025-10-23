# Script automatisé pour build IPA iOS avec EAS
# Usage: .\build-ios.ps1

Write-Host "🍎 FINALITY - BUILD IPA iOS" -ForegroundColor Cyan
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
Write-Host "🍎 INFORMATIONS iOS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  PRÉ-REQUIS iOS:" -ForegroundColor Yellow
Write-Host "   • Compte Apple Developer (99$/an)" -ForegroundColor Yellow
Write-Host "   • Certificats de signature iOS" -ForegroundColor Yellow
Write-Host "   • Bundle Identifier configuré" -ForegroundColor Yellow
Write-Host ""
Write-Host "⏱️  Durée estimée: 15-30 minutes" -ForegroundColor Yellow
Write-Host "📦 Type: IPA (production)" -ForegroundColor Yellow
Write-Host "🍎 Plateforme: iOS" -ForegroundColor Yellow
Write-Host ""

# Demander confirmation
$confirmation = Read-Host "Avez-vous un compte Apple Developer? (O/N)"

if ($confirmation -eq 'O' -or $confirmation -eq 'o' -or $confirmation -eq 'Y' -or $confirmation -eq 'y') {
    Write-Host ""
    Write-Host "🚀 Build iOS en cours..." -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Vous devrez peut-être fournir:" -ForegroundColor Yellow
    Write-Host "   • Apple ID" -ForegroundColor Yellow
    Write-Host "   • Mot de passe spécifique app" -ForegroundColor Yellow
    Write-Host "   • Team ID" -ForegroundColor Yellow
    Write-Host ""
    
    # Lancer le build
    eas build --platform ios --profile production
    
    Write-Host ""
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "✅ BUILD iOS TERMINÉ !" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📥 Téléchargez l'IPA depuis le lien fourni ci-dessus" -ForegroundColor Yellow
    Write-Host "📱 Distribuez via TestFlight ou App Store" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Build iOS annulé" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Pour créer un compte Apple Developer:" -ForegroundColor Yellow
    Write-Host "   https://developer.apple.com/programs/" -ForegroundColor Yellow
    Write-Host "   Coût: 99 USD/an" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
