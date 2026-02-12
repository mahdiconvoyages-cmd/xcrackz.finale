# Script de build APK pour éviter les plantages VS Code
# Usage: Clic droit sur ce fichier > Exécuter avec PowerShell

Write-Host "🚀 Build APK Finality v6.0.2" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Variables
$projectPath = "C:\Users\mahdi\Documents\Finality-okok\mobile"
$androidPath = "$projectPath\android"
$apkPath = "$androidPath\app\build\outputs\apk\release\app-release.apk"
$desktopPath = "$env:USERPROFILE\Desktop"
$version = "6.0.2"
$outputName = "finality-v$version-redesign.apk"

Write-Host "📂 Nettoyage des caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "$projectPath\.expo" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$projectPath\node_modules\.cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$androidPath\.gradle" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$androidPath\app\.cxx" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$androidPath\app\build" -ErrorAction SilentlyContinue
Write-Host "✅ Caches nettoyés" -ForegroundColor Green
Write-Host ""

Write-Host "🔨 Compilation de l'APK..." -ForegroundColor Yellow
Write-Host "   Cette opération peut prendre 5-10 minutes" -ForegroundColor Gray
Write-Host "   N'ouvrez PAS VS Code pendant le build" -ForegroundColor Red
Write-Host ""

Set-Location $androidPath

# Build avec options optimisées
$buildCommand = ".\gradlew assembleRelease --no-daemon --max-workers=2 --warning-mode=none"
Write-Host "   Commande: $buildCommand" -ForegroundColor Gray
Write-Host ""

Invoke-Expression $buildCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build réussi!" -ForegroundColor Green
    Write-Host ""
    
    # Vérifier que l'APK existe
    if (Test-Path $apkPath) {
        $apkSize = (Get-Item $apkPath).Length / 1MB
        Write-Host "📦 APK généré: $([Math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
        
        # Copier sur le bureau
        Write-Host "📋 Copie sur le bureau..." -ForegroundColor Yellow
        Copy-Item $apkPath "$desktopPath\$outputName" -Force
        
        if (Test-Path "$desktopPath\$outputName") {
            Write-Host "✅ APK copié: $desktopPath\$outputName" -ForegroundColor Green
            Write-Host ""
            Write-Host "🎉 BUILD TERMINÉ AVEC SUCCÈS!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📱 Installer l'APK sur votre téléphone:" -ForegroundColor Cyan
            Write-Host "   1. Transférez le fichier depuis le bureau" -ForegroundColor White
            Write-Host "   2. Désinstallez l'ancienne version" -ForegroundColor White
            Write-Host "   3. Installez la nouvelle version 6.0.2" -ForegroundColor White
        } else {
            Write-Host "❌ Erreur lors de la copie" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ APK non trouvé à: $apkPath" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "❌ Le build a échoué (code: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solutions:" -ForegroundColor Yellow
    Write-Host "   1. Fermez complètement VS Code" -ForegroundColor White
    Write-Host "   2. Relancez ce script" -ForegroundColor White
    Write-Host "   3. Vérifiez que Java est installé: java -version" -ForegroundColor White
}

Write-Host ""
Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
