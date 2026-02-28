-- Ajouter la colonne device_platform à la table profiles
-- Valeurs possibles : 'android', 'ios', 'web', NULL (anciens utilisateurs)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS device_platform TEXT;

-- Index pour accélérer le filtrage par plateforme (notifications ciblées)
CREATE INDEX IF NOT EXISTS idx_profiles_device_platform
  ON profiles (device_platform);
