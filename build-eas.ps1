# 🚀 BUILD APK + IPA SUR EAS CLOUD
# 
# Ce script va créer les builds Android (APK) et iOS (IPA) 
# directement sur les serveurs EAS de manière automatisée

Write-Host "🚀 BUILD APK + IPA SUR EAS CLOUD" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# ========================================
# VÉRIFICATIONS PRÉALABLES
# ========================================

Write-Host "`n📋 Vérifications préalables..." -ForegroundColor Yellow

# Vérifier qu'on est dans le bon dossier
if (-Not (Test-Path "mobile")) {
    Write-Host "❌ Erreur: Dossier 'mobile' introuvable" -ForegroundColor Red
    Write-Host "Exécutez ce script depuis la racine du projet" -ForegroundColor Red
    exit 1
}

Set-Location mobile

# Vérifier EAS CLI
Write-Host "`n🔍 Vérification EAS CLI..." -ForegroundColor Yellow
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue

if (-Not $easInstalled) {
    Write-Host "📦 Installation EAS CLI..." -ForegroundColor Yellow
    npm install -g eas-cli
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation d'EAS CLI" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ EAS CLI installé" -ForegroundColor Green
} else {
    Write-Host "✅ EAS CLI déjà installé" -ForegroundColor Green
}

# Vérifier connexion Expo
Write-Host "`n🔐 Vérification connexion Expo..." -ForegroundColor Yellow
$whoami = eas whoami 2>&1

if ($whoami -match "Not logged in") {
    Write-Host "🔑 Connexion à Expo requise..." -ForegroundColor Yellow
    eas login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de la connexion" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Connecté en tant que: $whoami" -ForegroundColor Green
}

# ========================================
# CONFIGURATION DU BUILD
# ========================================

Write-Host "`n⚙️ Configuration du build..." -ForegroundColor Yellow

# Mettre à jour eas.json pour APK
$easConfig = @{
    cli = @{
        version = ">= 16.20.3"
        appVersionSource = "remote"
    }
    build = @{
        development = @{
            developmentClient = $true
            distribution = "internal"
        }
        preview = @{
            distribution = "internal"
            android = @{
                buildType = "apk"
            }
        }
        production = @{
            autoIncrement = $true
            android = @{
                buildType = "apk"
            }
        }
    }
    submit = @{
        production = @{}
    }
}

$easConfig | ConvertTo-Json -Depth 10 | Set-Content "eas.json"
Write-Host "✅ Configuration EAS mise à jour (APK activé)" -ForegroundColor Green

# ========================================
# MENU DE SÉLECTION
# ========================================

Write-Host "`n📱 Que voulez-vous builder ?" -ForegroundColor Cyan
Write-Host "1. 🤖 Android APK uniquement" -ForegroundColor White
Write-Host "2. 🍎 iOS IPA uniquement" -ForegroundColor White
Write-Host "3. 📦 Android + iOS (les deux)" -ForegroundColor White
Write-Host "4. ❌ Annuler" -ForegroundColor White

$choice = Read-Host "`nVotre choix (1-4)"

# ========================================
# BUILD ANDROID APK
# ========================================

function Build-Android {
    Write-Host "`n🤖 DÉMARRAGE BUILD ANDROID APK" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    
    Write-Host "`n⏳ Cela peut prendre 10-15 minutes..." -ForegroundColor Yellow
    Write-Host "📊 Vous pouvez suivre la progression sur:" -ForegroundColor Cyan
    Write-Host "   https://expo.dev/accounts/[votre-compte]/projects/xcrackz-mobile/builds" -ForegroundColor Cyan
    
    Write-Host "`n🚀 Lancement du build APK..." -ForegroundColor Yellow
    
    eas build --platform android --profile production --non-interactive
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ BUILD ANDROID RÉUSSI !" -ForegroundColor Green
        Write-Host "`n📦 Pour télécharger l'APK:" -ForegroundColor Cyan
        Write-Host "   1. Aller sur https://expo.dev" -ForegroundColor White
        Write-Host "   2. Se connecter" -ForegroundColor White
        Write-Host "   3. Ouvrir le projet 'xcrackz-mobile'" -ForegroundColor White
        Write-Host "   4. Aller dans 'Builds'" -ForegroundColor White
        Write-Host "   5. Télécharger l'APK" -ForegroundColor White
        Write-Host "`n💡 L'APK peut être installé directement sur Android !" -ForegroundColor Yellow
    } else {
        Write-Host "`n❌ Erreur lors du build Android" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# ========================================
# BUILD iOS IPA
# ========================================

function Build-iOS {
    Write-Host "`n🍎 DÉMARRAGE BUILD iOS IPA" -ForegroundColor Green
    Write-Host "==========================" -ForegroundColor Green
    
    Write-Host "`n⚠️ PRÉREQUIS iOS:" -ForegroundColor Yellow
    Write-Host "   - Compte Apple Developer (99$/an)" -ForegroundColor White
    Write-Host "   - Certificats configurés" -ForegroundColor White
    
    $confirmIOS = Read-Host "`nAvez-vous un compte Apple Developer configuré ? (o/n)"
    
    if ($confirmIOS -ne "o" -and $confirmIOS -ne "O") {
        Write-Host "`n⚠️ Build iOS annulé" -ForegroundColor Yellow
        Write-Host "💡 Pour iOS, il faut:" -ForegroundColor Cyan
        Write-Host "   1. Compte Apple Developer: https://developer.apple.com" -ForegroundColor White
        Write-Host "   2. Configurer dans EAS: eas credentials" -ForegroundColor White
        return $false
    }
    
    Write-Host "`n⏳ Cela peut prendre 15-20 minutes..." -ForegroundColor Yellow
    Write-Host "📊 Vous pouvez suivre la progression sur:" -ForegroundColor Cyan
    Write-Host "   https://expo.dev/accounts/[votre-compte]/projects/xcrackz-mobile/builds" -ForegroundColor Cyan
    
    Write-Host "`n🚀 Lancement du build iOS..." -ForegroundColor Yellow
    
    eas build --platform ios --profile production --non-interactive
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ BUILD iOS RÉUSSI !" -ForegroundColor Green
        Write-Host "`n📱 Pour installer sur iPhone:" -ForegroundColor Cyan
        Write-Host "   Option A - TestFlight (Recommandé):" -ForegroundColor White
        Write-Host "   1. Télécharger l'IPA depuis expo.dev" -ForegroundColor White
        Write-Host "   2. Uploader sur App Store Connect" -ForegroundColor White
        Write-Host "   3. Distribuer via TestFlight" -ForegroundColor White
        Write-Host "`n   Option B - Installation directe:" -ForegroundColor White
        Write-Host "   1. Télécharger l'IPA depuis expo.dev" -ForegroundColor White
        Write-Host "   2. Installer via Xcode ou services tiers" -ForegroundColor White
    } else {
        Write-Host "`n❌ Erreur lors du build iOS" -ForegroundColor Red
        return $false
    }
    
    return $true
}

# ========================================
# EXÉCUTION SELON CHOIX
# ========================================

$androidSuccess = $false
$iosSuccess = $false

switch ($choice) {
    "1" {
        $androidSuccess = Build-Android
    }
    "2" {
        $iosSuccess = Build-iOS
    }
    "3" {
        Write-Host "`n📦 BUILD ANDROID + iOS" -ForegroundColor Cyan
        Write-Host "======================" -ForegroundColor Cyan
        
        $androidSuccess = Build-Android
        
        if ($androidSuccess) {
            Write-Host "`n⏸️ Pause de 5 secondes avant iOS..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            $iosSuccess = Build-iOS
        }
    }
    "4" {
        Write-Host "`n❌ Build annulé" -ForegroundColor Yellow
        Set-Location ..
        exit 0
    }
    Default {
        Write-Host "`n❌ Choix invalide" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}

# ========================================
# RÉSUMÉ FINAL
# ========================================

Write-Host "`n" -NoNewline
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ DES BUILDS" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

if ($choice -eq "1" -or $choice -eq "3") {
    if ($androidSuccess) {
        Write-Host "✅ Android APK: RÉUSSI" -ForegroundColor Green
    } else {
        Write-Host "❌ Android APK: ÉCHEC" -ForegroundColor Red
    }
}

if ($choice -eq "2" -or $choice -eq "3") {
    if ($iosSuccess) {
        Write-Host "✅ iOS IPA: RÉUSSI" -ForegroundColor Green
    } else {
        Write-Host "❌ iOS IPA: ÉCHEC" -ForegroundColor Red
    }
}

Write-Host "`n📱 TÉLÉCHARGEMENT DES BUILDS:" -ForegroundColor Cyan
Write-Host "   https://expo.dev" -ForegroundColor White

Write-Host "`n💡 PROCHAINES ÉTAPES:" -ForegroundColor Yellow
Write-Host "   1. Se connecter sur expo.dev" -ForegroundColor White
Write-Host "   2. Ouvrir projet 'xcrackz-mobile'" -ForegroundColor White
Write-Host "   3. Onglet 'Builds'" -ForegroundColor White
Write-Host "   4. Télécharger APK/IPA" -ForegroundColor White

Write-Host "`n🎉 Builds terminés !" -ForegroundColor Green

Set-Location ..

Write-Host "`nAppuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
