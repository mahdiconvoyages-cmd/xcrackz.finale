-- ============================================
-- QUICK FIX: Ajouter colonne assigned_to_user_id
-- ============================================

-- Ajouter la colonne si elle n'existe pas
ALTER TABLE missions ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Créer l'index
CREATE INDEX IF NOT EXISTS idx_missions_assigned_to_user ON missions(assigned_to_user_id);

-- Ajouter share_code si inexistant aussi
ALTER TABLE missions ADD COLUMN IF NOT EXISTS share_code VARCHAR(10) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_missions_share_code ON missions(share_code);

SELECT 'Colonnes ajoutées avec succès!' as result;
