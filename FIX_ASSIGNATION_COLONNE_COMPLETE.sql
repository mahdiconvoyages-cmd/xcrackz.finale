-- ================================================================
-- DIAGNOSTIC ET CORRECTION COMPLÈTE ASSIGNATION
-- ================================================================
-- PROBLÈME: Confusion entre assigned_user_id et assigned_to_user_id
-- DATE: 2025-11-07
-- ================================================================

-- ================================================
-- ÉTAPE 1: DIAGNOSTIC - Vérifier quelle colonne existe
-- ================================================

SELECT 
  'État actuel de la table missions' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'missions'
  AND column_name LIKE 'assigned%'
ORDER BY column_name;

-- Vérifier les données actuelles
SELECT 
  'Répartition actuelle' as info,
  COUNT(*) FILTER (WHERE assigned_to_user_id IS NOT NULL) as avec_assigned_to_user_id,
  COUNT(*) FILTER (WHERE assigned_user_id IS NOT NULL) as avec_assigned_user_id_si_existe
FROM missions;

-- ================================================
-- ÉTAPE 2: VÉRIFIER SI assigned_user_id EXISTE
-- ================================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'missions' 
      AND column_name = 'assigned_user_id'
  ) INTO v_column_exists;
  
  IF v_column_exists THEN
    RAISE NOTICE '⚠️ La colonne assigned_user_id EXISTE (ancienne version)';
    RAISE NOTICE '📝 Besoin de migrer les données vers assigned_to_user_id';
  ELSE
    RAISE NOTICE '✅ Seule assigned_to_user_id existe (correct)';
    RAISE NOTICE '📝 Le code utilise le mauvais nom de colonne';
  END IF;
END $$;

-- ================================================
-- ÉTAPE 3: SI assigned_user_id EXISTE, MIGRER LES DONNÉES
-- ================================================

-- Vérifier d'abord
DO $$
DECLARE
  v_has_old_column BOOLEAN;
  v_has_new_column BOOLEAN;
  v_count_old INTEGER;
BEGIN
  -- Vérifier les colonnes
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'missions' AND column_name = 'assigned_user_id'
  ) INTO v_has_old_column;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id'
  ) INTO v_has_new_column;
  
  RAISE NOTICE '🔍 Colonnes trouvées:';
  RAISE NOTICE '  - assigned_user_id: %', v_has_old_column;
  RAISE NOTICE '  - assigned_to_user_id: %', v_has_new_column;
  
  -- Si les deux existent, migrer
  IF v_has_old_column AND v_has_new_column THEN
    -- Compter les données à migrer
    EXECUTE 'SELECT COUNT(*) FROM missions WHERE assigned_user_id IS NOT NULL'
    INTO v_count_old;
    
    RAISE NOTICE '📊 Données à migrer: %', v_count_old;
    
    IF v_count_old > 0 THEN
      -- Migrer les données
      EXECUTE '
        UPDATE missions 
        SET assigned_to_user_id = assigned_user_id
        WHERE assigned_user_id IS NOT NULL
          AND (assigned_to_user_id IS NULL OR assigned_to_user_id != assigned_user_id)
      ';
      
      RAISE NOTICE '✅ Migration effectuée';
    END IF;
    
    -- Supprimer l'ancienne colonne
    EXECUTE 'ALTER TABLE missions DROP COLUMN IF EXISTS assigned_user_id CASCADE';
    RAISE NOTICE '🗑️ Ancienne colonne supprimée';
    
  ELSIF v_has_old_column AND NOT v_has_new_column THEN
    -- Renommer la colonne
    EXECUTE 'ALTER TABLE missions RENAME COLUMN assigned_user_id TO assigned_to_user_id';
    RAISE NOTICE '✅ Colonne renommée: assigned_user_id → assigned_to_user_id';
    
  ELSIF NOT v_has_old_column AND v_has_new_column THEN
    RAISE NOTICE '✅ Configuration correcte - assigned_to_user_id existe déjà';
    
  ELSE
    -- Créer la colonne
    EXECUTE 'ALTER TABLE missions ADD COLUMN assigned_to_user_id UUID REFERENCES auth.users(id)';
    RAISE NOTICE '✅ Colonne assigned_to_user_id créée';
  END IF;
END $$;

-- ================================================
-- ÉTAPE 4: VÉRIFIER LES FONCTIONS
-- ================================================

-- Lister toutes les fonctions de jointure
SELECT 
  proname as fonction,
  pg_get_function_identity_arguments(oid) as arguments,
  CASE 
    WHEN proname = 'join_mission_with_code' THEN '✅ Correct (mobile)'
    WHEN proname = 'join_mission_v2' THEN '⚠️ À vérifier/supprimer (web ancien)'
    ELSE '❓ Inconnue'
  END as statut
FROM pg_proc
WHERE proname LIKE 'join_mission%'
ORDER BY proname;

-- Vérifier le contenu de join_mission_v2
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_function_def TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'join_mission_v2'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    SELECT pg_get_functiondef(oid) INTO v_function_def
    FROM pg_proc WHERE proname = 'join_mission_v2' LIMIT 1;
    
    IF v_function_def LIKE '%assigned_user_id%' THEN
      RAISE NOTICE '❌ join_mission_v2 utilise assigned_user_id (INCORRECT)';
      RAISE NOTICE '📝 Recommandation: Supprimer cette fonction et utiliser join_mission_with_code';
    ELSE
      RAISE NOTICE '✅ join_mission_v2 semble correct';
    END IF;
  ELSE
    RAISE NOTICE '✅ join_mission_v2 n''existe pas';
  END IF;
END $$;

-- ================================================
-- ÉTAPE 5: NETTOYER join_mission_v2 SI ELLE EXISTE
-- ================================================

DROP FUNCTION IF EXISTS join_mission_v2(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS join_mission_v2(TEXT) CASCADE;
DROP FUNCTION IF EXISTS join_mission_v2 CASCADE;

-- ================================================
-- ÉTAPE 6: S'ASSURER QUE join_mission_with_code EXISTE
-- ================================================

-- Recréer la fonction correcte (déjà dans FIX_SECURITE_RAPPORTS_INSPECTION.sql)
-- mais on la recrée ici pour être sûr

DROP FUNCTION IF EXISTS join_mission_with_code(TEXT, UUID) CASCADE;

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
        assigned_to_user_id,  -- ✅ CORRECT
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
        assigned_to_user_id = p_user_id,  -- ✅ CORRECT
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
-- ÉTAPE 7: VÉRIFICATION FINALE
-- ================================================

SELECT 
  '✅ Configuration finale' as statut,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id') as colonne_correcte,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'missions' AND column_name = 'assigned_user_id') as colonne_incorrecte,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'join_mission_with_code') as fonction_correcte,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'join_mission_v2') as fonction_incorrecte;

-- Statistiques d'assignation
SELECT 
  '📊 Statistiques missions' as info,
  COUNT(*) as total_missions,
  COUNT(DISTINCT user_id) as nb_createurs,
  COUNT(assigned_to_user_id) as nb_assignations,
  COUNT(DISTINCT assigned_to_user_id) as nb_assignes
FROM missions;

-- ================================================================
-- RÉSUMÉ ATTENDU:
-- ================================================================
-- colonne_correcte = 1 (assigned_to_user_id existe)
-- colonne_incorrecte = 0 (assigned_user_id supprimée)
-- fonction_correcte = 1 (join_mission_with_code)
-- fonction_incorrecte = 0 (join_mission_v2 supprimée)
-- ================================================================
