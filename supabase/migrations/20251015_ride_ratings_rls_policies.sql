-- ============================================================
-- Migration: ride_ratings RLS policies + unique index
-- Sécurise la table ride_ratings pour le système de notation
-- ============================================================

-- 1) Activer RLS (déjà activé mais on s'assure)
ALTER TABLE ride_ratings ENABLE ROW LEVEL SECURITY;

-- 2) Policy INSERT : un utilisateur ne peut noter que pour lui-même
CREATE POLICY IF NOT EXISTS "Users can insert own ratings"
  ON ride_ratings
  FOR INSERT
  WITH CHECK (rater_id = auth.uid());

-- 3) Policy SELECT : un utilisateur voit les notes qu'il a données ou reçues
CREATE POLICY IF NOT EXISTS "Users can view own ratings"
  ON ride_ratings
  FOR SELECT
  USING (rater_id = auth.uid() OR rated_id = auth.uid());

-- 4) Policy UPDATE : un utilisateur peut modifier ses propres notes
CREATE POLICY IF NOT EXISTS "Users can update own ratings"
  ON ride_ratings
  FOR UPDATE
  USING (rater_id = auth.uid())
  WITH CHECK (rater_id = auth.uid());

-- 5) Policy DELETE : un utilisateur peut supprimer ses propres notes
CREATE POLICY IF NOT EXISTS "Users can delete own ratings"
  ON ride_ratings
  FOR DELETE
  USING (rater_id = auth.uid());

-- 6) Index unique : un seul avis par couple (match, rater)
CREATE UNIQUE INDEX IF NOT EXISTS ride_ratings_match_rater_idx
  ON ride_ratings(match_id, rater_id);
