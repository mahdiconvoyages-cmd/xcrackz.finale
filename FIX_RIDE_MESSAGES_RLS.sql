-- ================================================================
-- FIX: ride_messages RLS policy — autoriser les messages pour tous
-- les statuts actifs (proposed, accepted, in_transit), pas seulement 'accepted'
-- 
-- Erreur corrigée :
--   PostgrestException: 42501 - new row violates row-level security
--   policy for table "ride_messages"
--
-- Exécuter dans Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Supprimer l'ancienne policy INSERT trop restrictive
DROP POLICY IF EXISTS "Match participants can send messages" ON ride_messages;

-- 2. Recréer avec les bons statuts
CREATE POLICY "Match participants can send messages" ON ride_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM ride_matches
            WHERE ride_matches.id = ride_messages.match_id
              AND ride_matches.status IN ('proposed', 'accepted', 'in_transit')
              AND (ride_matches.driver_id = auth.uid() OR ride_matches.passenger_id = auth.uid())
        )
    );

-- 3. Corriger aussi la policy SELECT pour les mêmes statuts
DROP POLICY IF EXISTS "Match participants can view messages" ON ride_messages;

CREATE POLICY "Match participants can view messages" ON ride_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ride_matches
            WHERE ride_matches.id = ride_messages.match_id
              AND (ride_matches.driver_id = auth.uid() OR ride_matches.passenger_id = auth.uid())
        )
    );
