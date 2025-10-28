-- ============================================
-- Migration: Système de partage de missions par code
-- Date: 27 octobre 2025
-- Description: Remplace l'assignation manuelle par un système de codes de partage
-- ============================================

-- 1. Ajouter la colonne share_code (code de partage unique)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS share_code VARCHAR(10) UNIQUE;

-- 2. Ajouter la colonne assigned_user_id (utilisateur qui a rejoint la mission)
ALTER TABLE missions ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id);

-- 3. Créer un index pour recherche rapide par code
CREATE INDEX IF NOT EXISTS idx_missions_share_code ON missions(share_code);

-- 4. Créer un index pour recherche par utilisateur assigné
CREATE INDEX IF NOT EXISTS idx_missions_assigned_user ON missions(assigned_user_id);

-- ============================================
-- Fonction de génération automatique de code
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

-- ============================================
-- Trigger pour générer automatiquement un code à la création
-- ============================================

CREATE OR REPLACE FUNCTION auto_generate_share_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    -- Générer un code unique
    LOOP
        new_code := generate_share_code();
        
        -- Vérifier si le code existe déjà
        SELECT EXISTS(SELECT 1 FROM missions WHERE share_code = new_code) INTO code_exists;
        
        -- Si le code n'existe pas, l'utiliser
        EXIT WHEN NOT code_exists;
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

-- ============================================
-- Fonction pour rejoindre une mission avec un code
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
    
    -- Vérifier si la mission n'est pas déjà assignée
    IF v_mission.assigned_user_id IS NOT NULL AND v_mission.assigned_user_id != p_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Mission déjà assignée',
            'message', 'Cette mission a déjà été assignée à un autre utilisateur'
        );
    END IF;
    
    -- Assigner la mission à l'utilisateur
    UPDATE missions 
    SET assigned_user_id = p_user_id,
        status = 'assigned'
    WHERE id = v_mission.id;
    
    -- Retourner le succès avec les détails de la mission
    RETURN json_build_object(
        'success', true,
        'mission', row_to_json(v_mission),
        'message', 'Mission ajoutée avec succès'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Générer des codes pour les missions existantes
-- ============================================

DO $$
DECLARE
    mission_record RECORD;
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    -- Parcourir toutes les missions sans code
    FOR mission_record IN SELECT id FROM missions WHERE share_code IS NULL LOOP
        -- Générer un code unique
        LOOP
            new_code := generate_share_code();
            SELECT EXISTS(SELECT 1 FROM missions WHERE share_code = new_code) INTO code_exists;
            EXIT WHEN NOT code_exists;
        END LOOP;
        
        -- Mettre à jour la mission
        UPDATE missions SET share_code = new_code WHERE id = mission_record.id;
    END LOOP;
END $$;

-- ============================================
-- Politique RLS pour les missions partagées
-- ============================================

-- Permettre aux utilisateurs de voir les missions qu'ils ont rejointes
DROP POLICY IF EXISTS "Users can view missions they joined" ON missions;
CREATE POLICY "Users can view missions they joined"
    ON missions FOR SELECT
    USING (
        auth.uid() = user_id OR 
        auth.uid() = assigned_user_id
    );

-- Permettre aux utilisateurs assignés de mettre à jour la mission
DROP POLICY IF EXISTS "Assigned users can update missions" ON missions;
CREATE POLICY "Assigned users can update missions"
    ON missions FOR UPDATE
    USING (
        auth.uid() = user_id OR 
        auth.uid() = assigned_user_id
    );

-- ============================================
-- Vue pour les missions avec informations de l'utilisateur assigné
-- ============================================

CREATE OR REPLACE VIEW missions_with_assigned_user AS
SELECT 
    m.*,
    u.email as assigned_user_email,
    u.raw_user_meta_data->>'full_name' as assigned_user_name
FROM missions m
LEFT JOIN auth.users u ON m.assigned_user_id = u.id;

-- ============================================
-- Vérification
-- ============================================

-- Vérifier que les colonnes existent
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'missions' 
AND column_name IN ('share_code', 'assigned_user_id');

-- Vérifier quelques codes générés
SELECT id, share_code, status, assigned_user_id 
FROM missions 
LIMIT 5;

-- ============================================
-- NOTES D'UTILISATION
-- ============================================

/*
CRÉER UNE MISSION:
- Le code est généré automatiquement au format XZ-ABC-123
- Pas besoin de spécifier share_code dans INSERT

REJOINDRE UNE MISSION:
SELECT join_mission_with_code('XZ-ABC-123', 'user-uuid-here');

RÉCUPÉRER LES MISSIONS D'UN UTILISATEUR:
SELECT * FROM missions 
WHERE user_id = 'user-uuid' OR assigned_user_id = 'user-uuid';

VÉRIFIER SI UN CODE EXISTE:
SELECT * FROM missions WHERE share_code = 'XZ-ABC-123';
*/
