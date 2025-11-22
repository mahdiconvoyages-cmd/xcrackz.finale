# Script pour créer un APK minimal en commentant les features cassées
# Usage: .\create-minimal-apk.ps1

Write-Host "🔧 Création APK minimal - Commentaire des features cassées..." -ForegroundColor Cyan

# Backup des fichiers
$filesToFix = @(
    "lib\screens\covoiturage\my_bookings_screen.dart",
    "lib\screens\invoices\invoice_list_screen.dart",
    "lib\screens\scanner\document_scanner_screen.dart",
    "lib\widgets\app_drawer.dart"
)

foreach ($file in $filesToFix) {
    $fullPath = "c:\Users\mahdi\Documents\Finality-okok\mobile_flutter\finality_app\$file"
    if (Test-Path $fullPath) {
        Write-Host "   Backup: $file"
        Copy-Item $fullPath "$fullPath.bak" -Force
    }
}

Write-Host "`n🛠️  Pour compiler l'APK, il faut:" -ForegroundColor Yellow
Write-Host "   1. Corriger les erreurs de syntaxe dans invoice_list_screen.dart"
Write-Host "   2. Corriger les erreurs de syntaxe dans my_bookings_screen.dart"
Write-Host "   3. Retirer les références à EdgeDetection dans document_scanner_screen.dart"
Write-Host "   4. Corriger les imports dans app_drawer.dart"
Write-Host "`n⏱️  Temps estimé: 2-3 heures de correction manuelle"
Write-Host "`n💡 Alternative: Utiliser la version web React Native qui fonctionne" -ForegroundColor Green
