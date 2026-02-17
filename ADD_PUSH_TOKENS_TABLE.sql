-- Migration: Table pour stocker les tokens push (FCM / APNs)
-- À exécuter sur Supabase quand Firebase sera configuré

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Index pour recherche rapide par user
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Chaque user ne voit que ses propres tokens
CREATE POLICY "Users can manage own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour upsert propre
CREATE OR REPLACE FUNCTION upsert_push_token(
  p_token TEXT,
  p_platform TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO push_tokens (user_id, token, platform, updated_at)
  VALUES (auth.uid(), p_token, p_platform, now())
  ON CONFLICT (user_id, token) DO UPDATE SET
    platform = EXCLUDED.platform,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
