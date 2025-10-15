# 🚀 Script de démarrage automatique - Finality
# Lance les deux applications (Web + Mobile)

Write-Host "🚀 DÉMARRAGE DES APPLICATIONS FINALITY" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que nous sommes à la racine
if (-not (Test-Path ".\package.json")) {
    Write-Host "❌ ERREUR: Ce script doit être exécuté depuis la racine du projet" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Vérification des dépendances..." -ForegroundColor Yellow
Write-Host ""

# Vérifier node_modules web
if (-not (Test-Path ".\node_modules")) {
    Write-Host "⚠️  node_modules manquant pour le web" -ForegroundColor Yellow
    Write-Host "   Installation en cours..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de l'installation des dépendances web" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dépendances web installées" -ForegroundColor Green
}

# Vérifier node_modules mobile
if (-not (Test-Path ".\mobile\node_modules")) {
    Write-Host "⚠️  node_modules manquant pour le mobile" -ForegroundColor Yellow
    Write-Host "   Installation en cours (peut prendre plusieurs minutes)..." -ForegroundColor Yellow
    Set-Location mobile
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de l'installation des dépendances mobile" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "✅ Dépendances mobile installées" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Toutes les dépendances sont installées" -ForegroundColor Green
Write-Host ""

# Proposer quelle application lancer
Write-Host "Quelle application voulez-vous lancer ?" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🌐 Application WEB (Vite - http://localhost:5173)" -ForegroundColor White
Write-Host "2. 📱 Application MOBILE (Expo)" -ForegroundColor White
Write-Host "3. 🔄 LES DEUX (dans des terminaux séparés)" -ForegroundColor White
Write-Host "4. ❌ Annuler" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Votre choix (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🌐 Lancement de l'application WEB..." -ForegroundColor Cyan
        Write-Host "   → http://localhost:5173" -ForegroundColor Green
        Write-Host ""
        npm run dev
    }
    "2" {
        Write-Host ""
        Write-Host "📱 Lancement de l'application MOBILE..." -ForegroundColor Cyan
        Write-Host "   → Scanner le QR code avec Expo Go" -ForegroundColor Green
        Write-Host ""
        Set-Location mobile
        npm start
    }
    "3" {
        Write-Host ""
        Write-Host "🔄 Lancement des DEUX applications..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📱 Terminal 1: Mobile Expo" -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\mobile'; npm start"
        Start-Sleep -Seconds 2
        Write-Host "🌐 Terminal 2: Web Vite" -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
        Write-Host ""
        Write-Host "✅ Les deux applications sont lancées dans des terminaux séparés" -ForegroundColor Green
        Write-Host "   Web: http://localhost:5173" -ForegroundColor Green
        Write-Host "   Mobile: Scanner le QR code" -ForegroundColor Green
    }
    "4" {
        Write-Host ""
        Write-Host "❌ Annulé" -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "❌ Choix invalide" -ForegroundColor Red
        exit 1
    }
}
