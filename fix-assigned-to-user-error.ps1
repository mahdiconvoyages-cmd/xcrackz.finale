# ============================================
# 🔧 RÉSOLUTION: Erreur assigned_to_user_id
# ============================================

Write-Host ""
Write-Host "🔍 Diagnostic de l'erreur assigned_to_user_id..." -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Étapes de résolution:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1️⃣  VÉRIFIER LA BASE DE DONNÉES" -ForegroundColor Green
Write-Host "   Exécutez dans Supabase SQL Editor:" -ForegroundColor White
Write-Host "   " -NoNewline
Write-Host "SELECT column_name FROM information_schema.columns WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id';" -ForegroundColor Cyan
Write-Host ""
Write-Host "   ✅ Si résultat = assigned_to_user_id → La colonne existe" -ForegroundColor Green
Write-Host "   ❌ Si aucun résultat → Exécutez MIGRATION_SHARE_CODE_SYSTEM.sql" -ForegroundColor Red
Write-Host ""

Write-Host "2️⃣  FORCER LE REFRESH DU SCHÉMA POSTGREST" -ForegroundColor Green
Write-Host "   Exécutez dans Supabase SQL Editor:" -ForegroundColor White
Write-Host "   " -NoNewline
Write-Host "NOTIFY pgrst, 'reload schema';" -ForegroundColor Cyan
Write-Host ""

Write-Host "3️⃣  REDÉMARRER L'APPLICATION FRONTEND" -ForegroundColor Green
Write-Host "   Dans le terminal VS Code:" -ForegroundColor White
Write-Host "   • Arrêtez le serveur (Ctrl+C)" -ForegroundColor Cyan
Write-Host "   • Relancez: " -NoNewline
Write-Host "npm run dev" -ForegroundColor Cyan
Write-Host ""

Write-Host "4️⃣  VIDER LE CACHE DU NAVIGATEUR" -ForegroundColor Green
Write-Host "   • Chrome/Edge: " -NoNewline
Write-Host "Ctrl+Shift+Delete" -ForegroundColor Cyan
Write-Host "   • Ou mode navigation privée: " -NoNewline
Write-Host "Ctrl+Shift+N" -ForegroundColor Cyan
Write-Host ""

Write-Host "5️⃣  SI L'ERREUR PERSISTE" -ForegroundColor Green
Write-Host "   Vérifiez que vous utilisez la bonne URL Supabase:" -ForegroundColor White
Write-Host "   • Fichier: " -NoNewline
Write-Host "src/lib/supabase.ts" -ForegroundColor Cyan
Write-Host "   • Variable: " -NoNewline
Write-Host "VITE_SUPABASE_URL" -ForegroundColor Cyan
Write-Host ""

Write-Host "═══════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Voulez-vous que j'ouvre le fichier de vérification SQL? (O/N)"

if ($response -eq "O" -or $response -eq "o") {
    Write-Host ""
    Write-Host "📂 Ouverture de FORCE_SCHEMA_REFRESH.sql..." -ForegroundColor Cyan
    Start-Process "FORCE_SCHEMA_REFRESH.sql"
    Write-Host "✅ Copiez et exécutez ce SQL dans Supabase" -ForegroundColor Green
}

Write-Host ""
Write-Host "💡 ASTUCE:" -ForegroundColor Yellow
Write-Host "   L'erreur 'column does not exist' signifie généralement:" -ForegroundColor White
Write-Host "   1. La colonne n'a pas été créée en base" -ForegroundColor White
Write-Host "   2. PostgREST n'a pas rechargé le schéma" -ForegroundColor White
Write-Host "   3. Le cache du navigateur/app n'a pas été vidé" -ForegroundColor White
Write-Host ""
