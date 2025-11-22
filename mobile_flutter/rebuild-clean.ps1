# Script de nettoyage complet et rebuild Flutter
# Résout les problèmes de version cached

Write-Host "🧹 NETTOYAGE COMPLET FLUTTER" -ForegroundColor Cyan
Write-Host "=" * 60

# 1. Nettoyer Flutter
Write-Host "`n📦 Étape 1/5: Flutter clean..." -ForegroundColor Yellow
Set-Location "C:\Users\mahdi\Documents\Finality-okok\mobile_flutter\finality_app"
flutter clean

# 2. Supprimer les caches Gradle
Write-Host "`n🗑️ Étape 2/5: Suppression caches Gradle..." -ForegroundColor Yellow
if (Test-Path "android\.gradle") {
    Remove-Item -Recurse -Force "android\.gradle"
    Write-Host "✓ .gradle supprimé" -ForegroundColor Green
}
if (Test-Path "android\app\build") {
    Remove-Item -Recurse -Force "android\app\build"
    Write-Host "✓ android/app/build supprimé" -ForegroundColor Green
}
if (Test-Path "android\build") {
    Remove-Item -Recurse -Force "android\build"
    Write-Host "✓ android/build supprimé" -ForegroundColor Green
}
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
    Write-Host "✓ build supprimé" -ForegroundColor Green
}

# 3. Réinstaller dépendances
Write-Host "`n📥 Étape 3/5: Réinstallation dépendances..." -ForegroundColor Yellow
flutter pub get

# 4. Vérifier version dans pubspec.yaml
Write-Host "`n🔍 Étape 4/5: Vérification version..." -ForegroundColor Yellow
$pubspec = Get-Content "pubspec.yaml" | Select-String "^version:"
Write-Host "Version actuelle: $pubspec" -ForegroundColor Cyan

# 5. Build APK
Write-Host "`n🔨 Étape 5/5: Build APK Release..." -ForegroundColor Yellow
Write-Host "Ceci peut prendre 3-5 minutes..." -ForegroundColor Gray
flutter build apk --release

# Vérifier résultat
$apkPath = "build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $apkPath) {
    Write-Host "`n✅ BUILD RÉUSSI!" -ForegroundColor Green
    Write-Host "=" * 60
    
    $apk = Get-Item $apkPath
    Write-Host "`n📱 Informations APK:" -ForegroundColor Cyan
    Write-Host "   Taille: $([math]::Round($apk.Length / 1MB, 2)) MB" -ForegroundColor White
    Write-Host "   Date: $($apk.LastWriteTime)" -ForegroundColor White
    Write-Host "   Path: $($apk.FullName)" -ForegroundColor White
    
    # Vérifier version avec aapt
    $aapt = "C:\Users\mahdi\AppData\Local\Android\Sdk\build-tools\34.0.0\aapt.exe"
    if (Test-Path $aapt) {
        Write-Host "`n📋 Version dans APK:" -ForegroundColor Cyan
        $version = & $aapt dump badging $apkPath | Select-String "versionCode|versionName"
        Write-Host "   $version" -ForegroundColor White
    }
    
    Write-Host "`n📲 INSTALLATION:" -ForegroundColor Yellow
    Write-Host "1. Connectez votre téléphone en USB" -ForegroundColor White
    Write-Host "2. Activez le débogage USB" -ForegroundColor White
    Write-Host "3. Exécutez:" -ForegroundColor White
    Write-Host "   adb uninstall com.finality.app" -ForegroundColor Cyan
    Write-Host "   adb install '$apkPath'" -ForegroundColor Cyan
    Write-Host "`nOU copiez l'APK manuellement sur votre téléphone et installez-le" -ForegroundColor White
    
} else {
    Write-Host "`n❌ BUILD ÉCHOUÉ" -ForegroundColor Red
    Write-Host "Vérifiez les erreurs ci-dessus" -ForegroundColor Yellow
}
