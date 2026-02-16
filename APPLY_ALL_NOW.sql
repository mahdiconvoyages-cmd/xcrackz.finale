-- ============================================
-- MIGRATION COMPLÈTE EN UNE FOIS
-- Exécutez ce fichier dans Supabase SQL Editor
-- ============================================

-- ============================================
-- PARTIE 1: Colonnes (déjà fait normalement)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'share_code'
    ) THEN
        ALTER TABLE missions ADD COLUMN share_code VARCHAR(10) UNIQUE;
        CREATE INDEX idx_missions_share_code ON missions(share_code);
        RAISE NOTICE '✅ share_code créée';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id'
    ) THEN
        ALTER TABLE missions ADD COLUMN assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX idx_missions_assigned_to_user ON missions(assigned_to_user_id);
        RAISE NOTICE '✅ assigned_to_user_id créée';
    END IF;
END $$;

-- ============================================
-- PARTIE 2: Fonction de génération de code
-- ============================================
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := 'XZ-';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        IF i = 3 THEN
            result := result || '-';
        END IF;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PARTIE 3: Trigger pour génération automatique
-- ============================================
CREATE OR REPLACE FUNCTION auto_generate_share_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
    max_attempts INTEGER := 100;
    attempt INTEGER := 0;
BEGIN
    IF NEW.share_code IS NOT NULL THEN
        RETURN NEW;
    END IF;
    
    LOOP
        new_code := generate_share_code();
        SELECT EXISTS(SELECT 1 FROM missions WHERE share_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
        
        attempt := attempt + 1;
        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Impossible de générer un code unique';
        END IF;
    END LOOP;
    
    NEW.share_code := new_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_share_code ON missions;
CREATE TRIGGER trigger_auto_generate_share_code
    BEFORE INSERT ON missions
    FOR EACH ROW
    WHEN (NEW.share_code IS NULL)
    EXECUTE FUNCTION auto_generate_share_code();

-- ============================================
-- PARTIE 4: Fonction join_mission_with_code
-- ============================================
CREATE OR REPLACE FUNCTION join_mission_with_code(
    p_share_code TEXT,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_mission missions%ROWTYPE;
BEGIN
    -- Chercher la mission
    SELECT * INTO v_mission 
    FROM missions 
    WHERE UPPER(REPLACE(share_code, ' ', '')) = UPPER(REPLACE(p_share_code, ' ', ''));
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Code invalide',
            'message', 'Aucune mission trouvée avec ce code'
        );
    END IF;
    
    -- Vérifier que ce n'est pas le créateur
    IF v_mission.user_id = p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission propre',
            'message', 'Vous ne pouvez pas rejoindre votre propre mission'
        );
    END IF;
    
    -- Vérifier si déjà assignée
    IF v_mission.assigned_to_user_id IS NOT NULL AND v_mission.assigned_to_user_id != p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission déjà assignée',
            'message', 'Cette mission a déjà été assignée à un autre utilisateur'
        );
    END IF;
    
    -- Vérifier le statut
    IF v_mission.status IN ('cancelled', 'completed') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission terminée',
            'message', 'Cette mission est déjà terminée ou annulée'
        );
    END IF;
    
    -- Assigner la mission
    UPDATE missions 
    SET assigned_to_user_id = p_user_id,
        status = CASE 
            WHEN status = 'pending' THEN 'in_progress'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_mission.id;
    
    -- Récupérer la mission mise à jour
    SELECT * INTO v_mission FROM missions WHERE id = v_mission.id;
    
    RETURN json_build_object(
        'success', true,
        'mission', row_to_json(v_mission),
        'message', 'Mission ajoutée avec succès à votre liste'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTIE 5: Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION generate_share_code() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_generate_share_code() TO authenticated;

-- ============================================
-- PARTIE 6: Générer codes pour missions existantes
-- ============================================
DO $$
DECLARE
    mission_record RECORD;
    new_code TEXT;
    code_exists BOOLEAN;
    updated_count INTEGER := 0;
BEGIN
    FOR mission_record IN 
        SELECT id FROM missions WHERE share_code IS NULL 
    LOOP
        LOOP
            new_code := generate_share_code();
            SELECT EXISTS(SELECT 1 FROM missions WHERE share_code = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        
        UPDATE missions SET share_code = new_code WHERE id = mission_record.id;
        updated_count := updated_count + 1;
    END LOOP;
    
    IF updated_count > 0 THEN
        RAISE NOTICE '✅ % missions mises à jour avec codes', updated_count;
    END IF;
END $$;

-- ============================================
-- PARTIE 7: Refresh et vérification
-- ============================================
NOTIFY pgrst, 'reload schema';

SELECT 
    '✅ MIGRATION COMPLÈTE TERMINÉE' as statut,
    COUNT(*) as total_missions,
    COUNT(share_code) as missions_avec_code,
    COUNT(assigned_to_user_id) as missions_assignees
FROM missions;
