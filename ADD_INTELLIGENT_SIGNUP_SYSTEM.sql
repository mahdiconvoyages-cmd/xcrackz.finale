-- =============================================
-- SYSTÈME D'INSCRIPTION INTELLIGENT COMPLET
-- Migration pour questionnaire progressif + Anti-fraude
-- =============================================

-- ==========================================
-- 1. ENRICHISSEMENT TABLE PROFILES
-- ==========================================

-- Ajout colonnes informations entreprise
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS siret TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS legal_address TEXT,
ADD COLUMN IF NOT EXISTS bank_iban TEXT;

-- Ajout colonnes vérification
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS siret_verified BOOLEAN DEFAULT FALSE;

-- Ajout colonnes anti-fraude
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS registration_ip TEXT,
ADD COLUMN IF NOT EXISTS suspicious_flag BOOLEAN DEFAULT FALSE;

-- Ajout colonnes onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Ajout colonnes métadonnées
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type TEXT CHECK (user_type IN ('company', 'driver', 'individual')),
ADD COLUMN IF NOT EXISTS company_size TEXT CHECK (company_size IN ('solo', 'small', 'medium', 'large')),
ADD COLUMN IF NOT EXISTS fleet_size INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS app_role TEXT DEFAULT 'convoyeur' CHECK (app_role IN ('admin', 'donneur_d_ordre', 'convoyeur'));

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_profiles_siret ON public.profiles(siret) WHERE siret IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_device_fingerprint ON public.profiles(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_profiles_registration_ip ON public.profiles(registration_ip);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_completed);

-- ==========================================
-- 2. TABLE DÉTECTION DE FRAUDE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.fraud_detection_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    check_type TEXT NOT NULL, -- 'siret_duplicate', 'email_duplicate', 'phone_duplicate', 'device_duplicate', 'ip_suspicious'
    check_result TEXT NOT NULL, -- 'pass', 'warning', 'fail'
    details JSONB, -- Détails additionnels
    flagged_reason TEXT,
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_logs_user ON public.fraud_detection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_type ON public.fraud_detection_logs(check_type);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_result ON public.fraud_detection_logs(check_result);

ALTER TABLE public.fraud_detection_logs ENABLE ROW LEVEL SECURITY;

-- Policy temporaire permissive - à restreindre après création d'un admin
CREATE POLICY "Admins can view fraud logs" ON public.fraud_detection_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (app_role = 'admin' OR app_role = 'donneur_d_ordre')
        )
    );

-- ==========================================
-- 3. TABLE BLACKLIST
-- ==========================================

CREATE TABLE IF NOT EXISTS public.signup_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL, -- 'siret', 'email', 'phone', 'ip', 'device'
    value TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    severity TEXT DEFAULT 'high' CHECK (severity IN ('medium', 'high', 'critical')),
    added_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ, -- NULL = permanent
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blacklist_type_value ON public.signup_blacklist(type, value);

ALTER TABLE public.signup_blacklist ENABLE ROW LEVEL SECURITY;

-- Policy temporaire permissive - à restreindre après création d'un admin
CREATE POLICY "Admins manage blacklist" ON public.signup_blacklist
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND app_role = 'admin'
        )
    );

-- ==========================================
-- 4. TABLE TENTATIVES INSCRIPTION
-- ==========================================

CREATE TABLE IF NOT EXISTS public.signup_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    phone TEXT,
    device_fingerprint TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    step_reached INTEGER DEFAULT 1, -- Jusqu'à quelle étape l'utilisateur est arrivé
    success BOOLEAN DEFAULT FALSE,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signup_attempts_email ON public.signup_attempts(email);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip ON public.signup_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_device ON public.signup_attempts(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_created ON public.signup_attempts(created_at);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert signup attempts" ON public.signup_attempts
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- ==========================================
-- 5. FONCTION CALCUL PROFILE COMPLETION
-- ==========================================

CREATE OR REPLACE FUNCTION public.calculate_profile_completion(profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
    completion INTEGER := 0;
    required_fields INTEGER := 0;
    filled_fields INTEGER := 0;
BEGIN
    -- Récupérer le profil
    SELECT 
        CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 ELSE 0 END +
        CASE WHEN email IS NOT NULL AND email != '' THEN 1 ELSE 0 END +
        CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END +
        CASE WHEN avatar_url IS NOT NULL AND avatar_url != '' THEN 1 ELSE 0 END +
        CASE WHEN user_type IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN 
            (user_type = 'individual' OR user_type = 'driver') 
            OR (company IS NOT NULL AND company != '') 
        THEN 1 ELSE 0 END +
        CASE WHEN 
            (user_type = 'individual' OR user_type = 'driver') 
            OR (siret IS NOT NULL AND siret != '') 
        THEN 1 ELSE 0 END +
        CASE WHEN 
            (user_type = 'individual' OR user_type = 'driver') 
            OR (logo_url IS NOT NULL AND logo_url != '') 
        THEN 1 ELSE 0 END +
        CASE WHEN phone_verified = TRUE THEN 1 ELSE 0 END +
        CASE WHEN email_verified = TRUE THEN 1 ELSE 0 END
    INTO filled_fields
    FROM public.profiles
    WHERE id = profile_id;

    -- Total des champs requis = 10
    required_fields := 10;
    
    -- Calcul pourcentage
    completion := (filled_fields * 100) / required_fields;
    
    RETURN completion;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 6. FONCTION VÉRIFICATION FRAUDE
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_signup_fraud(
    p_email TEXT,
    p_phone TEXT,
    p_siret TEXT,
    p_device_fingerprint TEXT,
    p_ip_address TEXT
)
RETURNS JSONB AS $$
DECLARE
    fraud_score INTEGER := 0;
    fraud_flags JSONB := '[]'::JSONB;
    is_suspicious BOOLEAN := FALSE;
BEGIN
    -- Vérifier blacklist
    IF EXISTS (SELECT 1 FROM public.signup_blacklist WHERE type = 'email' AND value = p_email AND (expires_at IS NULL OR expires_at > NOW())) THEN
        fraud_flags := fraud_flags || jsonb_build_object('type', 'blacklist_email', 'severity', 'critical')::JSONB;
        fraud_score := fraud_score + 100;
    END IF;

    IF p_phone IS NOT NULL AND EXISTS (SELECT 1 FROM public.signup_blacklist WHERE type = 'phone' AND value = p_phone AND (expires_at IS NULL OR expires_at > NOW())) THEN
        fraud_flags := fraud_flags || jsonb_build_object('type', 'blacklist_phone', 'severity', 'critical')::JSONB;
        fraud_score := fraud_score + 100;
    END IF;

    IF p_siret IS NOT NULL AND EXISTS (SELECT 1 FROM public.signup_blacklist WHERE type = 'siret' AND value = p_siret AND (expires_at IS NULL OR expires_at > NOW())) THEN
        fraud_flags := fraud_flags || jsonb_build_object('type', 'blacklist_siret', 'severity', 'critical')::JSONB;
        fraud_score := fraud_score + 100;
    END IF;

    -- Vérifier duplications SIRET (comptes existants)
    IF p_siret IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE siret = p_siret) THEN
        fraud_flags := fraud_flags || jsonb_build_object('type', 'siret_duplicate', 'severity', 'high')::JSONB;
        fraud_score := fraud_score + 50;
    END IF;

    -- Vérifier duplications téléphone
    IF p_phone IS NOT NULL THEN
        IF (SELECT COUNT(*) FROM public.profiles WHERE phone = p_phone) >= 3 THEN
            fraud_flags := fraud_flags || jsonb_build_object('type', 'phone_multiple_accounts', 'severity', 'high')::JSONB;
            fraud_score := fraud_score + 40;
        ELSIF (SELECT COUNT(*) FROM public.profiles WHERE phone = p_phone) >= 1 THEN
            fraud_flags := fraud_flags || jsonb_build_object('type', 'phone_duplicate', 'severity', 'medium')::JSONB;
            fraud_score := fraud_score + 20;
        END IF;
    END IF;

    -- Vérifier device fingerprint (même appareil)
    IF p_device_fingerprint IS NOT NULL THEN
        IF (SELECT COUNT(*) FROM public.profiles WHERE device_fingerprint = p_device_fingerprint) >= 5 THEN
            fraud_flags := fraud_flags || jsonb_build_object('type', 'device_multiple_accounts', 'severity', 'high')::JSONB;
            fraud_score := fraud_score + 60;
        ELSIF (SELECT COUNT(*) FROM public.profiles WHERE device_fingerprint = p_device_fingerprint) >= 2 THEN
            fraud_flags := fraud_flags || jsonb_build_object('type', 'device_duplicate', 'severity', 'medium')::JSONB;
            fraud_score := fraud_score + 30;
        END IF;
    END IF;

    -- Vérifier tentatives multiples depuis même IP (rate limiting)
    IF (SELECT COUNT(*) FROM public.signup_attempts 
        WHERE ip_address = p_ip_address 
        AND created_at > NOW() - INTERVAL '1 hour') >= 5 THEN
        fraud_flags := fraud_flags || jsonb_build_object('type', 'ip_rate_limit', 'severity', 'medium')::JSONB;
        fraud_score := fraud_score + 30;
    END IF;

    -- Vérifier pattern suspect (email jetable/temporaire)
    IF p_email ~* '(temp|throw|disposable|trash|fake|test|@guerrillamail|@10minutemail)' THEN
        fraud_flags := fraud_flags || jsonb_build_object('type', 'disposable_email', 'severity', 'high')::JSONB;
        fraud_score := fraud_score + 50;
    END IF;

    -- Déterminer si suspicious
    is_suspicious := fraud_score >= 50;

    RETURN jsonb_build_object(
        'fraud_score', fraud_score,
        'is_suspicious', is_suspicious,
        'flags', fraud_flags,
        'recommendation', CASE 
            WHEN fraud_score >= 100 THEN 'block'
            WHEN fraud_score >= 50 THEN 'manual_review'
            ELSE 'allow'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 7. TRIGGER AUTO-UPDATE PROFILE COMPLETION
-- ==========================================

CREATE OR REPLACE FUNCTION public.trigger_update_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.profile_completion_percentage := public.calculate_profile_completion(NEW.id);
    
    -- Marquer onboarding comme complété si 100%
    IF NEW.profile_completion_percentage >= 90 AND NEW.onboarding_completed = FALSE THEN
        NEW.onboarding_completed := TRUE;
        NEW.onboarding_completed_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_profile_completion ON public.profiles;
CREATE TRIGGER trg_update_profile_completion
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_profile_completion();

-- ==========================================
-- 8. FONCTION PUBLIQUE POUR MOBILE
-- ==========================================

-- Fonction pour vérifier si email existe déjà (utilisable avant signup)
CREATE OR REPLACE FUNCTION public.check_email_available(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = p_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si SIRET existe déjà
CREATE OR REPLACE FUNCTION public.check_siret_available(p_siret TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (SELECT 1 FROM public.profiles WHERE siret = p_siret);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si téléphone existe déjà (warning mais pas bloquant)
CREATE OR REPLACE FUNCTION public.check_phone_usage_count(p_phone TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.profiles WHERE phone = p_phone);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 9. RLS POLICIES POUR NOUVELLES TABLES
-- ==========================================

-- Permettre aux utilisateurs de voir leurs propres logs
CREATE POLICY "Users can view own fraud logs" ON public.fraud_detection_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- ==========================================
-- 10. GRANTS
-- ==========================================

-- Accès aux fonctions publiques
GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_siret_available(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_usage_count(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_signup_fraud(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_profile_completion(UUID) TO authenticated;

-- ==========================================
-- COMMENTAIRES
-- ==========================================

COMMENT ON COLUMN public.profiles.siret IS 'Numéro SIRET validé via API INSEE';
COMMENT ON COLUMN public.profiles.device_fingerprint IS 'Empreinte unique de l''appareil pour détecter comptes multiples';
COMMENT ON COLUMN public.profiles.registration_ip IS 'Adresse IP lors de l''inscription';
COMMENT ON COLUMN public.profiles.suspicious_flag IS 'Flag automatique si comportement suspect détecté';
COMMENT ON COLUMN public.profiles.profile_completion_percentage IS 'Calculé automatiquement via trigger (0-100)';

COMMENT ON TABLE public.fraud_detection_logs IS 'Logs de détection de fraude lors inscription';
COMMENT ON TABLE public.signup_blacklist IS 'Liste noire SIRET/email/phone/IP/device bloqués';
COMMENT ON TABLE public.signup_attempts IS 'Toutes les tentatives d''inscription (succès et échecs)';

COMMENT ON FUNCTION public.check_signup_fraud IS 'Analyse complète anti-fraude retournant score et flags';
COMMENT ON FUNCTION public.calculate_profile_completion IS 'Calcule pourcentage de complétion du profil (0-100)';

-- FIN DE LA MIGRATION
