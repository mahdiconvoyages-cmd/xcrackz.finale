# Script de correction pour npm install bloqué
# Usage: .\fix-npm-install.ps1

Write-Host "🔧 CORRECTION NPM INSTALL BLOQUÉ" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Étape 1: Arrêter les processus npm
Write-Host "📍 Étape 1: Arrêt des processus npm..." -ForegroundColor Yellow
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*npm*"} | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "✅ Processus arrêtés" -ForegroundColor Green
Write-Host ""

# Étape 2: Nettoyer les fichiers
Write-Host "📍 Étape 2: Nettoyage des fichiers..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   Suppression de node_modules..." -ForegroundColor Gray
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
}
if (Test-Path "package-lock.json") {
    Write-Host "   Suppression de package-lock.json..." -ForegroundColor Gray
    Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
}
Write-Host "✅ Fichiers nettoyés" -ForegroundColor Green
Write-Host ""

# Étape 3: Nettoyer le cache npm
Write-Host "📍 Étape 3: Nettoyage du cache npm..." -ForegroundColor Yellow
npm cache clean --force 2>$null
Write-Host "✅ Cache nettoyé" -ForegroundColor Green
Write-Host ""

# Étape 4: Réinstaller
Write-Host "📍 Étape 4: Réinstallation des dépendances..." -ForegroundColor Yellow
Write-Host "   Cela peut prendre quelques minutes..." -ForegroundColor Gray
Write-Host ""

$installSuccess = $false
$attempts = @(
    @{name="Standard avec legacy-peer-deps"; cmd="npm install --legacy-peer-deps"},
    @{name="Avec force"; cmd="npm install --legacy-peer-deps --force"},
    @{name="Préférer offline"; cmd="npm install --prefer-offline --no-audit --legacy-peer-deps"}
)

foreach ($attempt in $attempts) {
    Write-Host "   Tentative: $($attempt.name)..." -ForegroundColor Cyan
    try {
        Invoke-Expression $attempt.cmd
        if ($LASTEXITCODE -eq 0) {
            $installSuccess = $true
            break
        }
    } catch {
        Write-Host "   Échec, essai suivant..." -ForegroundColor Red
    }
}

Write-Host ""

# Vérification finale
if ($installSuccess -or (Test-Path "node_modules")) {
    $packageCount = (Get-ChildItem node_modules -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Host "✅ INSTALLATION TERMINÉE" -ForegroundColor Green
    Write-Host "   $packageCount packages installés" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Vous pouvez maintenant lancer:" -ForegroundColor Cyan
    Write-Host "   npm run dev" -ForegroundColor White
} else {
    Write-Host "❌ INSTALLATION ÉCHOUÉE" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Suggestions:" -ForegroundColor Yellow
    Write-Host "   1. Vérifiez votre connexion internet" -ForegroundColor Gray
    Write-Host "   2. Désactivez temporairement l'antivirus" -ForegroundColor Gray
    Write-Host "   3. Essayez avec yarn: npm install -g yarn && yarn install" -ForegroundColor Gray
    Write-Host "   4. Fermez VS Code et réessayez" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
