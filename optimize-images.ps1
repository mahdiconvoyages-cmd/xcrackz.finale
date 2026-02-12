# Script d'optimisation des images pour réduire la taille de l'APK
# Compresse toutes les images PNG dans le dossier assets

Write-Host "=== OPTIMISATION DES IMAGES ===" -ForegroundColor Cyan

# Vérifier si pngquant est installé
$pngquantExists = Get-Command pngquant -ErrorAction SilentlyContinue

if (-not $pngquantExists) {
    Write-Host "`n⚠️ pngquant n'est pas installé. Installation en cours..." -ForegroundColor Yellow
    Write-Host "Téléchargez pngquant depuis: https://pngquant.org/" -ForegroundColor Yellow
    Write-Host "Ou utilisez: npm install -g pngquant-bin`n" -ForegroundColor Yellow
    
    # Alternative : utiliser un service en ligne
    Write-Host "Alternative : Compressez manuellement vos images sur:" -ForegroundColor Green
    Write-Host "- https://tinypng.com/" -ForegroundColor Green
    Write-Host "- https://squoosh.app/`n" -ForegroundColor Green
    exit 1
}

# Obtenir la taille avant compression
Write-Host "`n📊 Calcul de la taille avant compression..." -ForegroundColor Yellow
$beforeSize = (Get-ChildItem -Path "assets" -Recurse -Include "*.png" | Measure-Object -Property Length -Sum).Sum
$beforeSizeMB = [math]::Round($beforeSize / 1MB, 2)
Write-Host "Taille avant : $beforeSizeMB MB`n" -ForegroundColor Cyan

# Compresser toutes les images PNG
Write-Host "🔄 Compression des images PNG avec qualité 65-80%..." -ForegroundColor Yellow

# Images des véhicules (plus agressif car photos)
Write-Host "`n1. Compression des images de véhicules..." -ForegroundColor Green
Get-ChildItem -Path "assets/vehicles" -Filter "*.png" -Recurse | ForEach-Object {
    Write-Host "  - Compression de $($_.Name)..."
    & pngquant --quality=60-75 --speed=1 --ext=.png --force $_.FullName
}

# Icônes et splash (moins agressif pour garder la qualité)
Write-Host "`n2. Compression des icônes..." -ForegroundColor Green
$iconFiles = @("icon.png", "adaptive-icon.png", "splash.png", "blablacar.png")
foreach ($file in $iconFiles) {
    $fullPath = "assets\$file"
    if (Test-Path $fullPath) {
        Write-Host "  - Compression de $file..."
        & pngquant --quality=70-85 --speed=1 --ext=.png --force $fullPath
    }
}

# Obtenir la taille après compression
Write-Host "`n📊 Calcul de la taille après compression..." -ForegroundColor Yellow
$afterSize = (Get-ChildItem -Path "assets" -Recurse -Include "*.png" | Measure-Object -Property Length -Sum).Sum
$afterSizeMB = [math]::Round($afterSize / 1MB, 2)
$savings = $beforeSizeMB - $afterSizeMB
$savingsPercent = [math]::Round(($savings / $beforeSizeMB) * 100, 1)

Write-Host "`n✅ COMPRESSION TERMINÉE !" -ForegroundColor Green
Write-Host "Taille avant  : $beforeSizeMB MB" -ForegroundColor Cyan
Write-Host "Taille après  : $afterSizeMB MB" -ForegroundColor Green
Write-Host "Économie      : $savings MB (-$savingsPercent%)`n" -ForegroundColor Yellow

# Nettoyage des fichiers de backup pngquant
Write-Host "🧹 Nettoyage des fichiers temporaires..." -ForegroundColor Yellow
Get-ChildItem -Path "assets" -Recurse -Filter "*-fs8.png" | Remove-Item -Force
Write-Host "✅ Nettoyage terminé`n" -ForegroundColor Green

Write-Host "📝 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Vérifiez que les images sont toujours de bonne qualité" -ForegroundColor White
Write-Host "2. Commitez les changements: git add assets/ && git commit -m 'Optimize images'" -ForegroundColor White
Write-Host "3. Rebuilder l'APK: eas build --platform android`n" -ForegroundColor White
