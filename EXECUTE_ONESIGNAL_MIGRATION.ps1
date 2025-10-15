# 🚀 Script PowerShell - Exécuter migration OneSignal via Supabase CLI

Write-Host "📊 MIGRATION ONESIGNAL - NOTIFICATIONS PUSH" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Supabase CLI est installé
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI n'est pas installé" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation requise:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou utilisez Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard/project/erdxgujquowvkhmudaai/editor" -ForegroundColor White
    exit 1
}

Write-Host "✅ Supabase CLI détecté" -ForegroundColor Green
Write-Host ""

# Demander confirmation
Write-Host "Cette migration va créer:" -ForegroundColor Yellow
Write-Host "  - Table: user_devices (Player IDs OneSignal)" -ForegroundColor White
Write-Host "  - Table: notification_logs (Tracking notifications)" -ForegroundColor White
Write-Host "  - 4 vues de monitoring" -ForegroundColor White
Write-Host "  - 1 fonction get_notification_summary()" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Continuer? (y/n)"

if ($confirmation -ne 'y') {
    Write-Host "❌ Migration annulée" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Exécution de la migration..." -ForegroundColor Cyan

# Exécuter la migration
$migrationFile = "supabase\migrations\20250201_create_notification_tables.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Fichier de migration introuvable: $migrationFile" -ForegroundColor Red
    exit 1
}

# Lire et exécuter le fichier SQL
$sqlContent = Get-Content $migrationFile -Raw

# Via Supabase CLI (nécessite authentification)
Write-Host "📤 Connexion à Supabase..." -ForegroundColor Yellow

# Option 1: Via psql si disponible
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue

if ($psqlCmd) {
    Write-Host "Utilisation de psql..." -ForegroundColor Yellow
    
    $DB_URL = "postgresql://postgres.erdxgujquowvkhmudaai:[YOUR_DB_PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
    
    Write-Host ""
    Write-Host "⚠️  Vous devez remplacer [YOUR_DB_PASSWORD] dans la commande suivante:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "psql `"$DB_URL`" -f `"$migrationFile`"" -ForegroundColor White
    Write-Host ""
    
} else {
    # Afficher les instructions manuelles
    Write-Host ""
    Write-Host "📋 EXÉCUTION MANUELLE REQUISE:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Ouvrir: https://supabase.com/dashboard/project/erdxgujquowvkhmudaai/editor" -ForegroundColor White
    Write-Host "2. Cliquer: New Query" -ForegroundColor White
    Write-Host "3. Copier-coller le contenu de: $migrationFile" -ForegroundColor White
    Write-Host "4. Cliquer: Run (Ctrl+Enter)" -ForegroundColor White
    Write-Host ""
    Write-Host "✨ Après exécution, vous verrez:" -ForegroundColor Green
    Write-Host "  - ✅ Tables créées: user_devices, notification_logs" -ForegroundColor White
    Write-Host "  - ✅ Vues créées: notification_stats_by_user, notification_stats_by_type, etc." -ForegroundColor White
    Write-Host "  - ✅ Dashboard de monitoring installé avec succès !" -ForegroundColor White
    Write-Host ""
}

Write-Host "📚 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configurer REST API Key OneSignal" -ForegroundColor White
Write-Host "   - Aller sur: https://app.onesignal.com" -ForegroundColor Gray
Write-Host "   - Settings → Keys & IDs → Copier REST API Key" -ForegroundColor Gray
Write-Host "   - Supabase Dashboard → Settings → Edge Functions → Secrets" -ForegroundColor Gray
Write-Host "   - Ajouter: ONESIGNAL_API_KEY=votre-key" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Déployer Edge Function send-notification" -ForegroundColor White
Write-Host "   - cd supabase/functions" -ForegroundColor Gray
Write-Host "   - supabase functions deploy send-notification --project-ref erdxgujquowvkhmudaai" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Restart l'app mobile" -ForegroundColor White
Write-Host "   - cd mobile" -ForegroundColor Gray
Write-Host "   - npx expo start -c" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Script terminé" -ForegroundColor Green
