# ====================================================================
# SCRIPT DE DÉMARRAGE PROPRE - Finality Web
# ====================================================================
# Ce script arrête proprement tous les processus Node.js 
# et redémarre le serveur Vite avec les bonnes variables d'environnement
# ====================================================================

Write-Host "🚀 DÉMARRAGE PROPRE DU SERVEUR VITE" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Arrêter tous les processus Node.js
Write-Host "⏹️  Arrêt des processus Node.js..." -ForegroundColor Yellow
try {
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Processus Node.js arrêtés" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  Aucun processus Node.js à arrêter" -ForegroundColor Gray
}

Write-Host ""

# 2. Attendre que les processus se terminent
Write-Host "⏳ Attente 2 secondes..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Write-Host "✅ Prêt" -ForegroundColor Green

Write-Host ""

# 3. Vérifier que le fichier .env existe
if (Test-Path ".env") {
    Write-Host "✅ Fichier .env trouvé" -ForegroundColor Green
    
    # Afficher les variables chargées
    Write-Host ""
    Write-Host "📋 Variables d'environnement:" -ForegroundColor Cyan
    Get-Content .env | Select-String "VITE_" | ForEach-Object {
        $line = $_.Line
        if ($line -match "^VITE_([^=]+)=(.+)$") {
            $key = $matches[1]
            $value = $matches[2]
            # Masquer les secrets (afficher seulement les 20 premiers caractères)
            if ($value.Length -gt 20) {
                $maskedValue = $value.Substring(0, 20) + "..."
            } else {
                $maskedValue = $value
            }
            Write-Host "  - VITE_$key = $maskedValue" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "❌ ERREUR: Fichier .env introuvable!" -ForegroundColor Red
    Write-Host "   Créez un fichier .env à la racine avec:" -ForegroundColor Yellow
    Write-Host "   VITE_SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co" -ForegroundColor Gray
    Write-Host "   VITE_SUPABASE_ANON_KEY=..." -ForegroundColor Gray
    exit 1
}

Write-Host ""

# 4. Nettoyer le cache Vite (optionnel mais recommandé)
if (Test-Path "node_modules/.vite") {
    Write-Host "🧹 Nettoyage du cache Vite..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules/.vite" -ErrorAction SilentlyContinue
    Write-Host "✅ Cache Vite nettoyé" -ForegroundColor Green
    Write-Host ""
}

# 5. Démarrer le serveur Vite
Write-Host "🚀 Démarrage du serveur Vite..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ℹ️  Le serveur va démarrer sur http://localhost:5173" -ForegroundColor Gray
Write-Host "ℹ️  Appuyez sur Ctrl+C pour arrêter le serveur" -ForegroundColor Gray
Write-Host ""

# Lancer npm run dev
npm run dev
