-- ============================================================
-- FIX_CHAT_SYSTEM.sql
-- Améliorations du chat Entraide Convoyeurs :
-- 1. Politique UPDATE pour marquer les messages comme lus (is_read)
-- 2. Activer Realtime sur ride_messages (INSERT + UPDATE)
-- ============================================================

-- 1) Permettre aux destinataires de marquer les messages reçus comme lus
-- Un utilisateur peut mettre à jour is_read sur les messages QUI LUI SONT DESTINÉS
-- (c'est-à-dire les messages d'un match auquel il participe, envoyés par l'autre)
DO $$
BEGIN
  -- Supprimer la politique si elle existe déjà
  DROP POLICY IF EXISTS "Users can mark messages as read" ON ride_messages;

  -- Créer la politique UPDATE
  CREATE POLICY "Users can mark messages as read"
    ON ride_messages
    FOR UPDATE
    USING (
      -- L'utilisateur doit participer au match
      EXISTS (
        SELECT 1 FROM ride_matches rm
        WHERE rm.id = ride_messages.match_id
        AND (rm.driver_id = auth.uid() OR rm.passenger_id = auth.uid())
      )
      -- Et le message ne doit PAS être envoyé par lui (on marque ceux des autres comme lus)
      AND sender_id != auth.uid()
    )
    WITH CHECK (
      -- Même condition pour le WITH CHECK
      EXISTS (
        SELECT 1 FROM ride_matches rm
        WHERE rm.id = ride_messages.match_id
        AND (rm.driver_id = auth.uid() OR rm.passenger_id = auth.uid())
      )
      AND sender_id != auth.uid()
    );
END $$;

-- 2) Activer RLS si pas déjà fait
ALTER TABLE ride_messages ENABLE ROW LEVEL SECURITY;

-- 3) S'assurer que la colonne is_read existe (normalement déjà là)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ride_messages' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE ride_messages ADD COLUMN is_read BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 4) Activer Realtime pour ride_messages
-- (Publication Supabase pour que les subscriptions Realtime fonctionnent)
DO $$
BEGIN
  -- Vérifier si la table est déjà dans la publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'ride_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ride_messages;
  END IF;
END $$;

-- 5) Activer REPLICA IDENTITY FULL pour que UPDATE events envoient les données complètes
ALTER TABLE ride_messages REPLICA IDENTITY FULL;

SELECT 'FIX_CHAT_SYSTEM.sql appliqué avec succès ✅' AS result;
