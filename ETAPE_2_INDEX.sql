-- =========================================
-- ÉTAPE 2 : CRÉER LES INDEX
-- Exécuter APRÈS l'étape 1
-- =========================================

-- Index sur support_conversations
CREATE INDEX idx_support_conversations_user_id ON support_conversations(user_id);
CREATE INDEX idx_support_conversations_status ON support_conversations(status);

-- Index sur support_messages
CREATE INDEX idx_support_messages_conversation_id ON support_messages(conversation_id);
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at);

-- Index sur support_auto_responses
CREATE INDEX idx_support_auto_responses_category ON support_auto_responses(category);

-- Vérification
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename LIKE 'support%'
ORDER BY tablename, indexname;
