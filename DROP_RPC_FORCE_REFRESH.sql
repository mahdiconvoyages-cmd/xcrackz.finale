-- FORCER LE REFRESH : DROP puis recréer
DROP FUNCTION IF EXISTS close_mission_after_arrival(uuid);

-- Puis réexécutez RPC_CLOSE_MISSION_SECURE.sql
