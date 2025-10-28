# ============================================
# Nettoyage de la session invalide
# ============================================

Write-Host ""
Write-Host "🔧 Nettoyage de la session Supabase..." -ForegroundColor Cyan
Write-Host ""

Write-Host "ÉTAPES À SUIVRE:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1️⃣  EXÉCUTER LE SQL DE PERMISSIONS" -ForegroundColor Green
Write-Host "   📁 Fichier: " -NoNewline
Write-Host "FIX_RPC_PERMISSIONS.sql" -ForegroundColor Cyan
Write-Host "   • Ouvrez Supabase SQL Editor" -ForegroundColor White
Write-Host "   • Copiez-collez le contenu du fichier" -ForegroundColor White
Write-Host "   • Cliquez sur 'Run'" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣  NETTOYER LE NAVIGATEUR" -ForegroundColor Green
Write-Host "   Dans la console du navigateur (F12), tapez:" -ForegroundColor White
Write-Host "   " -NoNewline
Write-Host "localStorage.clear(); sessionStorage.clear(); location.reload();" -ForegroundColor Cyan
Write-Host ""

Write-Host "3️⃣  SE RECONNECTER" -ForegroundColor Green
Write-Host "   • L'application va vous rediriger vers /login" -ForegroundColor White
Write-Host "   • Reconnectez-vous avec vos identifiants" -ForegroundColor White
Write-Host ""

Write-Host "4️⃣  TESTER REJOINDRE UNE MISSION" -ForegroundColor Green
Write-Host "   • Créez une nouvelle mission" -ForegroundColor White
Write-Host "   • Notez le code de partage" -ForegroundColor White
Write-Host "   • Cliquez sur 'Rejoindre une mission'" -ForegroundColor White
Write-Host "   • Entrez le code" -ForegroundColor White
Write-Host ""

Write-Host "═══════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Write-Host "💡 CAUSE DU PROBLÈME:" -ForegroundColor Yellow
Write-Host "   Le refresh token est invalide car:" -ForegroundColor White
Write-Host "   • La session a expiré" -ForegroundColor White
Write-Host "   • Le token a été révoqué" -ForegroundColor White
Write-Host "   • Changement de configuration Supabase" -ForegroundColor White
Write-Host ""

Write-Host "🔍 SI L'ERREUR 400 PERSISTE SUR join_mission_with_code:" -ForegroundColor Yellow
Write-Host "   Vérifiez dans Supabase SQL Editor:" -ForegroundColor White
Write-Host "   " -NoNewline
Write-Host "SELECT * FROM missions WHERE share_code = 'VOTRE-CODE';" -ForegroundColor Cyan
Write-Host "   • Si aucun résultat → Le code n'existe pas" -ForegroundColor White
Write-Host "   • Si mission trouvée → Vérifier assigned_to_user_id" -ForegroundColor White
Write-Host ""

$response = Read-Host "Voulez-vous ouvrir le fichier SQL de permissions? (O/N)"

if ($response -eq "O" -or $response -eq "o") {
    Write-Host ""
    Write-Host "📂 Ouverture de FIX_RPC_PERMISSIONS.sql..." -ForegroundColor Cyan
    Start-Process "FIX_RPC_PERMISSIONS.sql"
    Write-Host "✅ Exécutez ce SQL dans Supabase" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Après ces étapes, tout devrait fonctionner!" -ForegroundColor Green
Write-Host ""
