# ============================================
# Script d'application de la migration Share Code
# ============================================

Write-Host "🚀 Application de la migration Share Code System..." -ForegroundColor Cyan
Write-Host ""

# Vérifier si le fichier SQL existe
if (-not (Test-Path "MIGRATION_SHARE_CODE_SYSTEM.sql")) {
    Write-Host "❌ Fichier MIGRATION_SHARE_CODE_SYSTEM.sql introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Fichier SQL trouvé" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Vous devez exécuter ce SQL dans Supabase SQL Editor" -ForegroundColor Yellow
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Cyan
Write-Host "1. Ouvrez https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Sélectionnez votre projet" -ForegroundColor White
Write-Host "3. Allez dans 'SQL Editor'" -ForegroundColor White
Write-Host "4. Créez une nouvelle requête" -ForegroundColor White
Write-Host "5. Copiez-collez le contenu de MIGRATION_SHARE_CODE_SYSTEM.sql" -ForegroundColor White
Write-Host "6. Cliquez sur 'Run'" -ForegroundColor White
Write-Host ""

# Ouvrir le fichier SQL dans l'éditeur par défaut
Write-Host "📂 Ouverture du fichier SQL..." -ForegroundColor Cyan
Start-Process "MIGRATION_SHARE_CODE_SYSTEM.sql"

Write-Host ""
Write-Host "✅ Fichier ouvert dans votre éditeur" -ForegroundColor Green
Write-Host "📋 Copiez son contenu et exécutez-le dans Supabase SQL Editor" -ForegroundColor Cyan
Write-Host ""

# Attendre confirmation
Write-Host "Appuyez sur Entrée une fois la migration exécutée dans Supabase..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "✅ Migration terminée !" -ForegroundColor Green
Write-Host "🔄 L'application va maintenant utiliser le système de codes de partage" -ForegroundColor Cyan
Write-Host ""
