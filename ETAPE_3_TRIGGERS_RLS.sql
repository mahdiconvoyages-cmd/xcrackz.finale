-- =========================================
-- ÉTAPE 3 : CRÉER TRIGGERS ET RLS
-- Exécuter APRÈS l'étape 2
-- =========================================

-- Fonction trigger pour mettre à jour last_message_at
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

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON support_messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Activer RLS
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_auto_responses ENABLE ROW LEVEL SECURITY;

-- Vérification
SELECT 
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'support%';
