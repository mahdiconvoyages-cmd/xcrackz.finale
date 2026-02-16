# 🚀 Installation Synchronisation Temps Réel + Maps Gratuites

Write-Host "🔄 Installation des dépendances Web + Mobile..." -ForegroundColor Cyan

# ========================================
# PARTIE 1 : WEB - OpenStreetMap + Leaflet
# ========================================

Write-Host "`n📦 Installation Web (OpenStreetMap + Leaflet)..." -ForegroundColor Yellow

Set-Location "C:\Users\mahdi\Documents\Finality-okok"

# Installer Leaflet pour les maps
npm install leaflet react-leaflet

# Types TypeScript
npm install -D @types/leaflet

Write-Host "✅ Dépendances Web installées" -ForegroundColor Green

# ========================================
# PARTIE 2 : MOBILE - Expo Notifications
# ========================================

Write-Host "`n📦 Installation Mobile (Notifications)..." -ForegroundColor Yellow

Set-Location "C:\Users\mahdi\Documents\Finality-okok\mobile"

# Expo Notifications déjà installé normalement, on vérifie
$packageJson = Get-Content "package.json" | ConvertFrom-Json

if (-not $packageJson.dependencies.'expo-notifications') {
    Write-Host "📲 Installation expo-notifications..." -ForegroundColor Yellow
    npm install expo-notifications
} else {
    Write-Host "✅ expo-notifications déjà installé" -ForegroundColor Green
}

# ========================================
# PARTIE 3 : Vérification
# ========================================

Write-Host "`n✅ Installation terminée !" -ForegroundColor Green
Write-Host "`n📋 Prochaines étapes :" -ForegroundColor Cyan
Write-Host "1. Exécuter ACTIVER_REALTIME_SUPABASE.sql dans Supabase" -ForegroundColor White
Write-Host "2. Importer OpenStreetMap dans vos composants" -ForegroundColor White
Write-Host "3. Utiliser useRealtimeSync() dans vos écrans mobile" -ForegroundColor White
Write-Host "4. Tester la synchronisation temps réel !" -ForegroundColor White

Write-Host "`n🗺️ Maps GRATUITES activées :" -ForegroundColor Cyan
Write-Host "- Web: OpenStreetMap + Leaflet (0€)" -ForegroundColor Green
Write-Host "- Mobile: Provider DEFAULT (Apple Maps/OSM, 0€)" -ForegroundColor Green

Write-Host "`n🔔 Notifications disponibles :" -ForegroundColor Cyan
Write-Host "- Web: Browser Notifications (natif)" -ForegroundColor Green
Write-Host "- Mobile: Expo Notifications (local + push)" -ForegroundColor Green

Write-Host "`nAppuyez sur une touche pour continuer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
