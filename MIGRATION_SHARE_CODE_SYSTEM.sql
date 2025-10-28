-- ============================================
-- MIGRATION COMPLÈTE: Système d'assignation par code
-- Date: 27 octobre 2025
-- Description: Standardise sur assigned_to_user_id et share_code
-- ============================================

-- ============================================
-- ÉTAPE 1: Vérifier/Ajouter les colonnes nécessaires
-- ============================================

-- Ajouter share_code si inexistant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'share_code'
    ) THEN
        ALTER TABLE missions ADD COLUMN share_code VARCHAR(10) UNIQUE;
        CREATE INDEX idx_missions_share_code ON missions(share_code);
        RAISE NOTICE '✅ Colonne share_code créée';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne share_code existe déjà';
    END IF;
END $$;

-- Ajouter assigned_to_user_id si inexistant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id'
    ) THEN
        ALTER TABLE missions ADD COLUMN assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX idx_missions_assigned_to_user ON missions(assigned_to_user_id);
        RAISE NOTICE '✅ Colonne assigned_to_user_id créée';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne assigned_to_user_id existe déjà';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 2: Fonction de génération de code
-- ============================================

CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sans I, O, 0, 1 pour éviter confusion
    result TEXT := 'XZ-';
    i INTEGER;
BEGIN
    -- Générer 6 caractères aléatoires
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        -- Ajouter un tiret après 3 caractères (format XZ-ABC-123)
        IF i = 3 THEN
            result := result || '-';
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_share_code IS 'Génère un code de partage unique au format XZ-ABC-123';

-- ============================================
-- ÉTAPE 3: Trigger de génération automatique
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_share_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
    max_attempts INTEGER := 100;
    attempt INTEGER := 0;
BEGIN
    -- Si le code est déjà fourni, ne rien faire
    IF NEW.share_code IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    -- Générer un code unique
    LOOP
        new_code := generate_share_code();
        
        -- Vérifier si le code existe déjà
        SELECT EXISTS(SELECT 1 FROM missions WHERE share_code = new_code) INTO code_exists;
        
        -- Si le code n'existe pas, l'utiliser
        EXIT WHEN NOT code_exists;
        
        -- Protection contre boucle infinie
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Impossible de générer un code unique après % tentatives', max_attempts;
        END IF;
    END LOOP;
    
    NEW.share_code := new_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_share_code ON missions;
CREATE TRIGGER trigger_auto_generate_share_code
    BEFORE INSERT ON missions
    FOR EACH ROW
    WHEN (NEW.share_code IS NULL)
    EXECUTE FUNCTION auto_generate_share_code();

COMMENT ON TRIGGER trigger_auto_generate_share_code ON missions IS 'Génère automatiquement un code de partage à la création d''une mission';

-- ============================================
-- ÉTAPE 4: Fonction join_mission_with_code
-- ============================================

CREATE OR REPLACE FUNCTION join_mission_with_code(
    p_share_code TEXT,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_mission missions%ROWTYPE;
    v_result JSON;
BEGIN
    -- Chercher la mission par code (insensible à la casse et aux espaces)
    SELECT * INTO v_mission 
    FROM missions 
    WHERE UPPER(REPLACE(share_code, ' ', '')) = UPPER(REPLACE(p_share_code, ' ', ''));
    
    -- Vérifier si la mission existe
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Code invalide',
            'message', 'Aucune mission trouvée avec ce code'
        );
    END IF;
    
    -- Vérifier si l'utilisateur est le créateur de la mission
    IF v_mission.user_id = p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission propre',
            'message', 'Vous ne pouvez pas rejoindre votre propre mission'
        );
    END IF;
    
    -- Vérifier si la mission n'est pas déjà assignée
    IF v_mission.assigned_to_user_id IS NOT NULL AND v_mission.assigned_to_user_id != p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission déjà assignée',
            'message', 'Cette mission a déjà été assignée à un autre utilisateur'
        );
    END IF;
    
    -- Vérifier si la mission n'est pas annulée ou terminée
    IF v_mission.status IN ('cancelled', 'completed') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission terminée',
            'message', 'Cette mission est déjà terminée ou annulée'
        );
    END IF;
    
    -- Assigner la mission à l'utilisateur
    UPDATE missions 
    SET assigned_to_user_id = p_user_id,
        status = CASE 
            WHEN status = 'pending' THEN 'in_progress'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_mission.id;
    
    -- Retourner le succès avec les détails de la mission
    SELECT * INTO v_mission FROM missions WHERE id = v_mission.id;
    
    RETURN json_build_object(
        'success', true,
        'mission', row_to_json(v_mission),
        'message', 'Mission ajoutée avec succès à votre liste'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION join_mission_with_code IS 'Permet à un utilisateur de rejoindre une mission via un code de partage';

-- ============================================
-- ÉTAPE 5: Générer des codes pour missions existantes
-- ============================================

DO $$
DECLARE
    mission_record RECORD;
    new_code TEXT;
    code_exists BOOLEAN;
    updated_count INTEGER := 0;
BEGIN
    -- Parcourir toutes les missions sans code
    FOR mission_record IN 
        SELECT id FROM missions WHERE share_code IS NULL 
    LOOP
        -- Générer un code unique
        LOOP
            new_code := generate_share_code();
            SELECT EXISTS(SELECT 1 FROM missions WHERE share_code = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        
        -- Mettre à jour la mission
        UPDATE missions SET share_code = new_code WHERE id = mission_record.id;
        updated_count := updated_count + 1;
    END LOOP;
    
    IF updated_count > 0 THEN
        RAISE NOTICE '✅ % missions mises à jour avec des codes de partage', updated_count;
    ELSE
        RAISE NOTICE 'ℹ️  Aucune mission sans code trouvée';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 6: Vérifications finales
-- ============================================

DO $$
DECLARE
    total_missions INTEGER;
    missions_with_code INTEGER;
    missions_without_code INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_missions FROM missions;
    SELECT COUNT(*) INTO missions_with_code FROM missions WHERE share_code IS NOT NULL;
    SELECT COUNT(*) INTO missions_without_code FROM missions WHERE share_code IS NULL;
    
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '📊 RAPPORT FINAL';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '✅ Total missions: %', total_missions;
    RAISE NOTICE '✅ Missions avec code: %', missions_with_code;
    
    IF missions_without_code > 0 THEN
        RAISE WARNING '⚠️  Missions sans code: % (cela ne devrait pas arriver)', missions_without_code;
    ELSE
        RAISE NOTICE '✅ Toutes les missions ont un code de partage';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════';
END $$;
