/*
  # Système de boutique et crédits

  ## Nouvelles tables
  
  1. `credits_packages` - Packs de crédits disponibles à l'achat
     - `id` (uuid, primary key)
     - `name` (text) - Nom du pack
     - `description` (text) - Description du pack
     - `credits` (integer) - Nombre de crédits
     - `price` (numeric) - Prix en euros
     - `is_popular` (boolean) - Pack populaire ou non
     - `is_active` (boolean) - Pack actif ou non
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  2. `user_credits` - Crédits des utilisateurs
     - `id` (uuid, primary key)
     - `user_id` (uuid, foreign key to profiles)
     - `credits_balance` (integer) - Solde de crédits
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  3. `transactions` - Historique des transactions
     - `id` (uuid, primary key)
     - `user_id` (uuid, foreign key to profiles)
     - `package_id` (uuid, foreign key to credits_packages)
     - `amount` (numeric) - Montant payé
     - `credits` (integer) - Crédits achetés
     - `payment_id` (text) - ID de paiement Mollie
     - `payment_status` (text) - Statut du paiement
     - `created_at` (timestamptz)

  ## Sécurité
  
  - Enable RLS on all tables
  - Users can only read their own credits and transactions
  - Only authenticated users can view packages
*/

-- Create credits_packages table
CREATE TABLE IF NOT EXISTS credits_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  credits integer NOT NULL CHECK (credits > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  is_popular boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credits_balance integer NOT NULL DEFAULT 0 CHECK (credits_balance >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES credits_packages(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  credits integer NOT NULL,
  payment_id text UNIQUE,
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE credits_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credits_packages
CREATE POLICY "Anyone can view active packages"
  ON credits_packages
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for user_credits
CREATE POLICY "Users can view own credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert default credit packages
INSERT INTO credits_packages (name, description, credits, price, is_popular, is_active) VALUES
  ('Pack Débutant', 'Parfait pour commencer', 10, 9.99, false, true),
  ('Pack Pro', 'Le choix des professionnels', 25, 19.99, true, true),
  ('Pack Expert', 'Pour les utilisateurs avancés', 100, 39.99, false, true),
  ('Pack Entreprise', 'Solution complète pour entreprises', 650, 79.99, false, true)
ON CONFLICT DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_credits_packages_updated_at ON credits_packages;
CREATE TRIGGER update_credits_packages_updated_at
  BEFORE UPDATE ON credits_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
