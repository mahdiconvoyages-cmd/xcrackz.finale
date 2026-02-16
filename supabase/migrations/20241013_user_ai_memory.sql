-- 🧠 Table pour la mémoire personnalisée de Clara AI
-- Stocke tout ce que Clara apprend sur chaque utilisateur

CREATE TABLE IF NOT EXISTS user_ai_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Données de mémoire (JSONB pour flexibilité)
  memory_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index pour recherche rapide
  CONSTRAINT unique_user_memory UNIQUE(user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_ai_memory_user_id ON user_ai_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_memory_updated ON user_ai_memory(updated_at DESC);

-- Index GIN pour recherche dans JSONB
CREATE INDEX IF NOT EXISTS idx_user_ai_memory_data ON user_ai_memory USING GIN (memory_data);

-- RLS (Row Level Security)
ALTER TABLE user_ai_memory ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs ne voient que leur propre mémoire
CREATE POLICY "Users can view own AI memory"
  ON user_ai_memory
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leur mémoire
CREATE POLICY "Users can create own AI memory"
  ON user_ai_memory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent mettre à jour leur mémoire
CREATE POLICY "Users can update own AI memory"
  ON user_ai_memory
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_user_ai_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_user_ai_memory_timestamp ON user_ai_memory;
CREATE TRIGGER update_user_ai_memory_timestamp
  BEFORE UPDATE ON user_ai_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ai_memory_timestamp();

-- Commentaires
COMMENT ON TABLE user_ai_memory IS 'Mémoire personnalisée de l''IA Clara pour chaque utilisateur';
COMMENT ON COLUMN user_ai_memory.memory_data IS 'Données JSON contenant: profile, habits, preferences, interactions, context, learning';
COMMENT ON COLUMN user_ai_memory.updated_at IS 'Dernière mise à jour de la mémoire';

-- Exemples de requêtes utiles:

-- Récupérer la mémoire d'un utilisateur
-- SELECT memory_data FROM user_ai_memory WHERE user_id = 'xxx';

-- Mettre à jour un insight
-- UPDATE user_ai_memory 
-- SET memory_data = jsonb_set(memory_data, '{learning,insights}', 
--     memory_data->'learning'->'insights' || '[{"category":"mission","insight":"Préfère les missions courtes","confidence":0.9,"learnedAt":1234567890}]')
-- WHERE user_id = 'xxx';

-- Chercher users avec un véhicule préféré spécifique
-- SELECT user_id, memory_data->'habits'->'favoriteVehicles'
-- FROM user_ai_memory
-- WHERE memory_data @> '{"habits":{"favoriteVehicles":[{"make":"Peugeot"}]}}';
