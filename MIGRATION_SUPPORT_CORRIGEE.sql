-- =========================================
-- MIGRATION SUPPORT - VERSION CORRIGÉE
-- À exécuter dans Supabase SQL Editor
-- =========================================

-- 1. Créer les tables AVANT les index et triggers
CREATE TABLE IF NOT EXISTS support_conversations (
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

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sender_type text DEFAULT 'user' CHECK (sender_type IN ('user', 'admin', 'bot')),
  message text NOT NULL,
  is_automated boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_auto_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keywords text[] NOT NULL,
  response text NOT NULL,
  category text NOT NULL,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Créer les index (APRÈS les tables)
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation_id ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_support_auto_responses_category ON support_auto_responses(category);

-- 3. Créer la fonction trigger
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_conversations
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON support_messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- 5. Activer RLS
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_auto_responses ENABLE ROW LEVEL SECURITY;

-- 6. Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view own conversations" ON support_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON support_conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON support_conversations;
DROP POLICY IF EXISTS "Admins can update all conversations" ON support_conversations;

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON support_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON support_messages;
DROP POLICY IF EXISTS "Users can send messages in own conversations" ON support_messages;
DROP POLICY IF EXISTS "Admins can send messages in all conversations" ON support_messages;

DROP POLICY IF EXISTS "Admins can manage auto responses" ON support_auto_responses;
DROP POLICY IF EXISTS "Anyone can view active auto responses" ON support_auto_responses;

-- 7. Créer les policies
CREATE POLICY "Users can view own conversations"
  ON support_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
  ON support_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can create own conversations"
  ON support_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all conversations"
  ON support_conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can view messages in own conversations"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Users can send messages in own conversations"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
      AND support_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can send messages in all conversations"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can manage auto responses"
  ON support_auto_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Anyone can view active auto responses"
  ON support_auto_responses FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 8. Insérer les réponses automatiques (si pas déjà présentes)
INSERT INTO support_auto_responses (keywords, response, category, priority, is_active)
SELECT * FROM (VALUES
  (ARRAY['bonjour', 'hello', 'salut', 'hey'], 'Bonjour ! Merci de nous contacter. Comment puis-je vous aider aujourd''hui ?', 'greeting', 10, true),
  (ARRAY['prix', 'tarif', 'coût', 'combien', 'paiement', 'facturation'], 'Pour toute question concernant nos tarifs, je vous invite à consulter notre page Boutique où vous trouverez tous nos plans détaillés. Un administrateur pourra également vous répondre sous peu pour toute question spécifique.', 'billing', 8, true),
  (ARRAY['crédit', 'crédits', 'recharger', 'acheter'], 'Vous pouvez acheter des crédits directement depuis la page Boutique. Chaque mission coûte 1 crédit. Le GPS tracking et les inspections sont gratuits ! Un administrateur reste disponible si vous avez des questions.', 'billing', 9, true),
  (ARRAY['bug', 'erreur', 'problème', 'fonctionne pas', 'ne marche pas'], 'Je suis désolé d''apprendre que vous rencontrez un problème technique. J''ai transmis votre message à notre équipe technique qui vous répondra dans les plus brefs délais. Pouvez-vous décrire précisément le problème rencontré ?', 'technical', 10, true),
  (ARRAY['mission', 'créer mission', 'nouvelle mission'], 'Pour créer une mission, rendez-vous dans la section "Missions" puis cliquez sur "Nouvelle Mission". Vous aurez besoin de 1 crédit par mission. Besoin d''aide supplémentaire ? Un admin vous répondra bientôt !', 'general', 7, true),
  (ARRAY['gps', 'tracking', 'suivi', 'localisation'], 'Le tracking GPS est totalement GRATUIT ! Il fait partie de l''état des lieux. Vous pouvez suivre vos missions en temps réel sans consommer de crédits. Un administrateur reste disponible pour plus d''informations.', 'general', 8, true),
  (ARRAY['inspection', 'état des lieux', 'photos'], 'Les inspections de départ et d''arrivée sont entièrement gratuites et illimitées ! Vous pouvez prendre autant de photos que nécessaire. Un administrateur peut vous aider si besoin.', 'general', 7, true),
  (ARRAY['compte', 'profil', 'mot de passe', 'email'], 'Pour gérer votre compte, rendez-vous dans la section Paramètres. Vous pouvez y modifier vos informations personnelles et votre mot de passe. Un administrateur vous répondra sous peu si vous avez besoin d''aide supplémentaire.', 'account', 6, true),
  (ARRAY['merci', 'thank', 'thanks'], 'Je vous en prie ! N''hésitez pas si vous avez d''autres questions. Notre équipe est là pour vous aider.', 'general', 5, true),
  (ARRAY['annuler', 'supprimer', 'résilier'], 'Pour toute demande d''annulation ou de résiliation, un administrateur va examiner votre demande et vous répondre rapidement. Pouvez-vous préciser ce que vous souhaitez annuler ?', 'account', 9, true)
) AS t(keywords, response, category, priority, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM support_auto_responses WHERE category = t.category LIMIT 1
);

-- 9. Vérification finale
SELECT 'Tables créées avec succès' AS status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'support%'
ORDER BY table_name;
