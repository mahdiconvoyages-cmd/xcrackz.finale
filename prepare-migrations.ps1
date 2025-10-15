# 🚀 Script d'Aide pour Copier les Migrations SQL
# Ce script affiche les migrations SQL prêtes à copier

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                               ║" -ForegroundColor Cyan
Write-Host "║     🚨 MIGRATIONS SUPABASE REQUISES                          ║" -ForegroundColor Cyan
Write-Host "║                                                               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  ERREUR DÉTECTÉE :" -ForegroundColor Red
Write-Host "   Les tables Supabase n'existent pas dans votre base de données" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 SOLUTION :" -ForegroundColor Green
Write-Host "   Exécuter les migrations SQL sur Supabase Dashboard" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Migration 1 : Support System
Write-Host "📝 MIGRATION 1 : Système Support" -ForegroundColor Magenta
Write-Host "   Fichier : supabase/migrations/20251010011552_create_support_system.sql" -ForegroundColor Gray
Write-Host ""

$migration1 = Get-Content "supabase\migrations\20251010011552_create_support_system.sql" -Raw -ErrorAction SilentlyContinue

if ($migration1) {
    Write-Host "✅ Fichier trouvé (273 lignes)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 ÉTAPES :" -ForegroundColor Yellow
    Write-Host "   1. Ouvrir : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/sql" -ForegroundColor White
    Write-Host "   2. Copier le contenu du fichier ci-dessous" -ForegroundColor White
    Write-Host "   3. Coller dans SQL Editor" -ForegroundColor White
    Write-Host "   4. Cliquer 'RUN' ou appuyer sur F5" -ForegroundColor White
    Write-Host ""
    
    # Créer fichier temporaire facile à copier
    $tempFile = "MIGRATION_SUPPORT_COPY_THIS.sql"
    Set-Content -Path $tempFile -Value $migration1
    Write-Host "💾 Fichier créé pour copie facile : $tempFile" -ForegroundColor Cyan
    Write-Host "   Ouvrir ce fichier, Ctrl+A, Ctrl+C, puis coller dans Supabase" -ForegroundColor Gray
} else {
    Write-Host "❌ Fichier migration non trouvé" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Migration 2 : Missions (si besoin)
Write-Host "📝 MIGRATION 2 : Table Missions (Si erreur persiste)" -ForegroundColor Magenta
Write-Host ""

$migrationMissionsContent = @'
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  departure_address text,
  arrival_address text,
  scheduled_date timestamptz,
  driver_id uuid REFERENCES contacts(id),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_user_id ON missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_scheduled_date ON missions(scheduled_date);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missions"
  ON missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all missions"
  ON missions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
'@

$tempFileMissions = "MIGRATION_MISSIONS_COPY_THIS.sql"
Set-Content -Path $tempFileMissions -Value $migrationMissionsContent
Write-Host "💾 Fichier créé : $tempFileMissions" -ForegroundColor Cyan
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Instructions finales
Write-Host "🎯 RÉSUMÉ DES ACTIONS :" -ForegroundColor Green
Write-Host ""
Write-Host "   MAINTENANT :" -ForegroundColor Yellow
Write-Host "   1. Ouvrir Supabase : https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn/sql" -ForegroundColor White
Write-Host "   2. Ouvrir le fichier : MIGRATION_SUPPORT_COPY_THIS.sql" -ForegroundColor White
Write-Host "   3. Sélectionner tout (Ctrl+A) et copier (Ctrl+C)" -ForegroundColor White
Write-Host "   4. Coller dans SQL Editor et cliquer RUN" -ForegroundColor White
Write-Host ""
Write-Host "   SI ERREUR 'missions.title does not exist' PERSISTE :" -ForegroundColor Yellow
Write-Host "   5. Ouvrir : MIGRATION_MISSIONS_COPY_THIS.sql" -ForegroundColor White
Write-Host "   6. Copier et exécuter dans SQL Editor" -ForegroundColor White
Write-Host ""
Write-Host "   APRÈS MIGRATIONS :" -ForegroundColor Yellow
Write-Host "   7. npm run dev (redémarrer serveur)" -ForegroundColor White
Write-Host "   8. Ctrl+F5 dans navigateur (vider cache)" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "📖 Documentation complète : URGENT_MIGRATION_SUPABASE.md" -ForegroundColor Cyan
Write-Host ""

# Ouvrir automatiquement les fichiers dans l'éditeur par défaut
Write-Host "💡 Voulez-vous ouvrir les fichiers SQL maintenant ? (O/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'O' -or $response -eq 'o') {
    if (Test-Path $tempFile) {
        Start-Process $tempFile
        Write-Host "✅ Fichier Support ouvert" -ForegroundColor Green
    }
    if (Test-Path $tempFileMissions) {
        Start-Process $tempFileMissions
        Write-Host "✅ Fichier Missions ouvert" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✨ Prêt à copier dans Supabase !" -ForegroundColor Green
Write-Host ""
