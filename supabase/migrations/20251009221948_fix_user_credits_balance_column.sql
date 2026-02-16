/*
  # Correction du nom de colonne dans user_credits

  1. Modifications
    - Renomme `credits_balance` en `balance` pour cohérence avec le code
    - Ajoute les politiques RLS manquantes pour les admins

  2. Sécurité
    - Les admins peuvent modifier les crédits de tous les utilisateurs
    - Les utilisateurs peuvent voir leur propre solde
*/

-- Renommer la colonne credits_balance en balance
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_credits' 
    AND column_name = 'credits_balance'
  ) THEN
    ALTER TABLE user_credits 
    RENAME COLUMN credits_balance TO balance;
  END IF;
END $$;

-- Permettre aux admins de modifier tous les crédits
CREATE POLICY "Admins can update any user credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Permettre aux admins de créer des crédits pour n'importe quel utilisateur
CREATE POLICY "Admins can insert any user credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
