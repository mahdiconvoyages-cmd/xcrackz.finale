-- =========================================
-- ÉTAPE 1 : CRÉER LES TABLES UNIQUEMENT
-- Exécuter CETTE étape d'abord
-- =========================================

-- Supprimer les tables si elles existent (pour repartir de zéro)
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS support_conversations CASCADE;
DROP TABLE IF EXISTS support_auto_responses CASCADE;

-- Créer support_conversations EN PREMIER (car support_messages dépend de cette table)
CREATE TABLE support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text DEFAULT 'general' CHECK (category IN ('technical', 'billing', 'general', 'feature_request', 'bug', 'account')),
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer support_messages APRÈS support_conversations
CREATE TABLE support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sender_type text DEFAULT 'user' CHECK (sender_type IN ('user', 'admin', 'bot')),
  message text NOT NULL,
  is_automated boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Créer support_auto_responses (indépendante)
CREATE TABLE support_auto_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keywords text[] NOT NULL,
  response text NOT NULL,
  category text NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Vérification : Lister les colonnes de support_messages
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'support_messages'
ORDER BY ordinal_position;
