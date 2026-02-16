-- Table pour stocker les tokens push des utilisateurs
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Index pour rechercher rapidement les tokens d'un utilisateur
CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_active ON user_push_tokens(is_active) WHERE is_active = true;

-- RLS policies
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir et modifier leurs propres tokens
CREATE POLICY "Users can view own push tokens"
  ON user_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON user_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON user_push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON user_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_push_tokens_updated_at_trigger ON user_push_tokens;
CREATE TRIGGER update_push_tokens_updated_at_trigger
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- Fonction pour envoyer une notification push (à utiliser côté serveur avec Expo Push API)
CREATE OR REPLACE FUNCTION send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_tokens RECORD;
  v_result JSONB DEFAULT '[]'::jsonb;
BEGIN
  -- Récupérer tous les tokens actifs de l'utilisateur
  FOR v_tokens IN 
    SELECT push_token, platform 
    FROM user_push_tokens 
    WHERE user_id = p_user_id AND is_active = true
  LOOP
    -- Ajouter à la liste des notifications à envoyer
    v_result = v_result || jsonb_build_object(
      'to', v_tokens.push_token,
      'title', p_title,
      'body', p_body,
      'data', p_data,
      'sound', 'default',
      'priority', 'high'
    );
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON user_push_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION send_push_notification TO authenticated;

COMMENT ON TABLE user_push_tokens IS 'Stocke les tokens Expo Push pour les notifications mobiles';
COMMENT ON FUNCTION send_push_notification IS 'Prépare les données de notification push pour l''API Expo';
