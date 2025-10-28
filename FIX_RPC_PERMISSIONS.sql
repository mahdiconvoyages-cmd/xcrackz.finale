-- ============================================
-- DIAGNOSTIC & FIX COMPLET
-- ============================================

-- ÉTAPE 1: DIAGNOSTIC - Vérifier l'état actuel
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'missions' AND column_name = 'share_code'
        ) THEN '✅ share_code existe'
        ELSE '❌ share_code MANQUANTE'
    END as status_share_code,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'missions' AND column_name = 'assigned_to_user_id'
        ) THEN '✅ assigned_to_user_id existe'
        ELSE '❌ assigned_to_user_id MANQUANTE'
    END as status_assigned_to_user_id;

-- ÉTAPE 2: CRÉER LES COLONNES SI MANQUANTES
-- Ajouter share_code
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
        RAISE NOTICE 'ℹ️  share_code existe déjà';
    END IF;
END $$;

-- Ajouter assigned_to_user_id
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
        RAISE NOTICE 'ℹ️  assigned_to_user_id existe déjà';
    END IF;
END $$;

-- ÉTAPE 3: Vérifier que les colonnes sont bien créées
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'missions' 
AND column_name IN ('share_code', 'assigned_to_user_id')
ORDER BY column_name;

-- ÉTAPE 4: Forcer le refresh du schéma PostgREST
NOTIFY pgrst, 'reload schema';

SELECT '🎉 Colonnes créées! Redémarrez votre app frontend maintenant.' as resultat;
