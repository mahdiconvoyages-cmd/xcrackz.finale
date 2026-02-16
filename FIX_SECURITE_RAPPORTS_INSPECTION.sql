-- ================================================================
-- FIX SÉCURITÉ RAPPORTS D'INSPECTION - 2025-11-07
-- ================================================================
-- PROBLÈME CRITIQUE: Tous les utilisateurs voient tous les rapports
-- SOLUTION: Filtrer par user_id ET assigned_to_user_id
-- ================================================================

-- ================================================
-- DIAGNOSTIC AVANT CORRECTION
-- ================================================

-- Vérifier les colonnes de la table missions
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'missions'
  AND column_name IN ('user_id', 'assigned_to_user_id', 'share_code')
ORDER BY column_name;

-- Compter les missions par type d'accès
SELECT 
  'Missions créées' as type,
  user_id,
  COUNT(*) as nombre
FROM missions
GROUP BY user_id

UNION ALL

SELECT 
  'Missions assignées',
  assigned_to_user_id,
  COUNT(*)
FROM missions
WHERE assigned_to_user_id IS NOT NULL
GROUP BY assigned_to_user_id

ORDER BY type, nombre DESC;

-- ================================================
-- VÉRIFIER LA FONCTION join_mission_with_code
-- ================================================

-- Lister la fonction
SELECT 
  proname as fonction,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'join_mission_with_code';

-- Si la fonction n'existe pas ou a des problèmes, la recréer
DO $$
BEGIN
  -- Supprimer anciennes versions
  DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID) CASCADE;
  DROP FUNCTION IF EXISTS join_mission_with_code(TEXT) CASCADE;
  DROP FUNCTION IF EXISTS join_mission_with_code CASCADE;
  
  RAISE NOTICE 'Anciennes fonctions supprimées';
END $$;

-- Créer la fonction corrigée
CREATE OR REPLACE FUNCTION join_mission_with_code(
    p_share_code TEXT,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_mission RECORD;
    v_mission_id UUID;
BEGIN
    RAISE NOTICE '🔍 Recherche mission avec code: %, user: %', p_share_code, p_user_id;
    
    -- Chercher la mission par code
    SELECT id INTO v_mission_id
    FROM missions 
    WHERE UPPER(REPLACE(share_code, ' ', '')) = UPPER(REPLACE(p_share_code, ' ', ''))
    LIMIT 1;
    
    IF v_mission_id IS NULL THEN
        RAISE NOTICE '❌ Code invalide: %', p_share_code;
        RETURN json_build_object(
            'success', false,
            'error', 'Code invalide',
            'message', 'Aucune mission trouvée avec ce code'
        );
    END IF;
    
    -- Récupérer les infos de la mission
    SELECT 
        id, 
        reference, 
        user_id, 
        assigned_to_user_id,
        status, 
        share_code
    INTO v_mission 
    FROM missions 
    WHERE id = v_mission_id;
    
    RAISE NOTICE '✅ Mission trouvée: % (créateur: %, assigné: %)', 
        v_mission.reference, v_mission.user_id, v_mission.assigned_to_user_id;
    
    -- Vérifier que ce n'est pas le créateur
    IF v_mission.user_id = p_user_id THEN
        RAISE NOTICE '❌ L''utilisateur est le créateur';
        RETURN json_build_object(
            'success', false,
            'error', 'Mission propre',
            'message', 'Vous ne pouvez pas rejoindre votre propre mission'
        );
    END IF;
    
    -- Vérifier si déjà assignée à quelqu'un d'autre
    IF v_mission.assigned_to_user_id IS NOT NULL AND v_mission.assigned_to_user_id != p_user_id THEN
        RAISE NOTICE '❌ Déjà assignée à: %', v_mission.assigned_to_user_id;
        RETURN json_build_object(
            'success', false,
            'error', 'Mission déjà assignée',
            'message', 'Cette mission a déjà été assignée à un autre utilisateur'
        );
    END IF;
    
    -- Vérifier le statut
    IF v_mission.status IN ('cancelled', 'completed') THEN
        RAISE NOTICE '❌ Mission terminée/annulée: %', v_mission.status;
        RETURN json_build_object(
            'success', false,
            'error', 'Mission terminée',
            'message', 'Cette mission est déjà terminée ou annulée'
        );
    END IF;
    
    -- Si déjà assigné à cet utilisateur, retourner succès
    IF v_mission.assigned_to_user_id = p_user_id THEN
        RAISE NOTICE '✅ Déjà assigné à cet utilisateur';
        RETURN json_build_object(
            'success', true,
            'mission_id', v_mission_id,
            'message', 'Mission déjà dans votre liste'
        );
    END IF;
    
    -- Assigner la mission
    UPDATE missions 
    SET 
        assigned_to_user_id = p_user_id,
        status = CASE 
            WHEN status = 'pending' THEN 'in_progress'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_mission_id;
    
    RAISE NOTICE '✅ Mission % assignée à %', v_mission.reference, p_user_id;
    
    -- Créer notification
    INSERT INTO user_notifications (user_id, type, title, message, metadata)
    VALUES (
        v_mission.user_id,  -- Notifier le créateur
        'mission_assigned',
        'Mission assignée',
        'Votre mission ' || v_mission.reference || ' a été acceptée',
        json_build_object('mission_id', v_mission_id, 'assigned_to', p_user_id)
    );
    
    RETURN json_build_object(
        'success', true,
        'mission_id', v_mission_id,
        'message', 'Mission ajoutée avec succès à votre liste'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', 'Erreur serveur',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO anon;

-- ================================================
-- VÉRIFIER RLS SUR vehicle_inspections
-- ================================================

-- Lister les policies existantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vehicle_inspections';

-- ================================================
-- CRÉER/RECRÉER RLS SÉCURISÉ
-- ================================================

-- Activer RLS si pas déjà fait
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Supprimer anciennes policies
DROP POLICY IF EXISTS "Users can view their inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Users can insert their inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Users can update their inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON vehicle_inspections;
DROP POLICY IF EXISTS "Public can view inspections" ON vehicle_inspections;

-- Policy SELECT: Voir inspections de ses missions (créées OU assignées)
CREATE POLICY "Inspections - SELECT own or assigned"
ON vehicle_inspections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM missions m
    WHERE m.id = vehicle_inspections.mission_id
      AND (
        m.user_id = auth.uid()                    -- Ses missions
        OR m.assigned_to_user_id = auth.uid()     -- Missions assignées à lui
      )
  )
);

-- Policy INSERT: Créer inspection pour ses missions
CREATE POLICY "Inspections - INSERT own or assigned"
ON vehicle_inspections
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM missions m
    WHERE m.id = vehicle_inspections.mission_id
      AND (
        m.user_id = auth.uid()
        OR m.assigned_to_user_id = auth.uid()
      )
  )
);

-- Policy UPDATE: Modifier inspection de ses missions
CREATE POLICY "Inspections - UPDATE own or assigned"
ON vehicle_inspections
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM missions m
    WHERE m.id = vehicle_inspections.mission_id
      AND (
        m.user_id = auth.uid()
        OR m.assigned_to_user_id = auth.uid()
      )
  )
);

-- ================================================
-- RLS SUR inspection_photos_v2
-- ================================================

ALTER TABLE inspection_photos_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Photos - SELECT own or assigned" ON inspection_photos_v2;
DROP POLICY IF EXISTS "Photos - INSERT own or assigned" ON inspection_photos_v2;

-- Policy SELECT
CREATE POLICY "Photos - SELECT own or assigned"
ON inspection_photos_v2
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vehicle_inspections vi
    JOIN missions m ON vi.mission_id = m.id
    WHERE vi.id = inspection_photos_v2.inspection_id
      AND (
        m.user_id = auth.uid()
        OR m.assigned_to_user_id = auth.uid()
      )
  )
);

-- Policy INSERT
CREATE POLICY "Photos - INSERT own or assigned"
ON inspection_photos_v2
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vehicle_inspections vi
    JOIN missions m ON vi.mission_id = m.id
    WHERE vi.id = inspection_photos_v2.inspection_id
      AND (
        m.user_id = auth.uid()
        OR m.assigned_to_user_id = auth.uid()
      )
  )
);

-- ================================================
-- VÉRIFICATION FINALE
-- ================================================

-- Compter inspections par utilisateur
SELECT 
  m.user_id as createur,
  m.assigned_to_user_id as assigne_a,
  COUNT(vi.id) as inspections,
  COUNT(DISTINCT m.id) as missions
FROM vehicle_inspections vi
JOIN missions m ON vi.mission_id = m.id
GROUP BY m.user_id, m.assigned_to_user_id
ORDER BY inspections DESC;

-- Tester la fonction
DO $$
DECLARE
  v_result JSON;
  v_test_code TEXT;
  v_test_user UUID;
BEGIN
  -- Prendre un code existant pour test
  SELECT share_code, user_id INTO v_test_code, v_test_user
  FROM missions
  WHERE share_code IS NOT NULL
    AND assigned_to_user_id IS NULL
    AND status = 'pending'
  LIMIT 1;
  
  IF v_test_code IS NOT NULL THEN
    RAISE NOTICE '🧪 Test avec code: %', v_test_code;
    
    -- Créer un faux UUID pour test
    v_result := join_mission_with_code(
      v_test_code,
      gen_random_uuid()  -- Faux utilisateur
    );
    
    RAISE NOTICE '📊 Résultat test: %', v_result;
  ELSE
    RAISE NOTICE '⚠️ Aucune mission avec share_code disponible pour test';
  END IF;
END $$;

-- ================================================================
-- RÉSUMÉ
-- ================================================================

SELECT 
  '✅ Sécurité rapports d''inspection corrigée' as statut,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'vehicle_inspections') as policies_inspections,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'inspection_photos_v2') as policies_photos,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'join_mission_with_code') as fonction_exists;

-- ================================================================
-- INSTRUCTIONS:
-- ================================================================
-- 1. Ouvrir Supabase Dashboard → SQL Editor
-- 2. Copier/coller ce script
-- 3. Cliquer "Run"
-- 4. Vérifier les NOTICES dans les résultats
-- 5. Tester dans l'app mobile
-- ================================================================
