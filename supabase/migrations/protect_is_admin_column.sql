-- ============================================
-- MIGRATION: SÉCURISATION CRITIQUE - Protection is_admin
-- Date: 14 octobre 2025
-- Description: Empêche les utilisateurs de s'auto-promouvoir admin
-- ============================================

-- ⚠️ PROBLÈME DÉTECTÉ:
-- La RLS policy actuelle "Users can update own profile" permet à n'importe qui
-- de modifier la colonne is_admin de son propre profil via:
-- UPDATE profiles SET is_admin = true WHERE id = auth.uid();

-- ✅ SOLUTION: Trigger qui empêche la modification de is_admin par les non-admins

CREATE OR REPLACE FUNCTION prevent_is_admin_self_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la valeur de is_admin change
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    
    -- Vérifier si l'utilisateur qui fait la modification est admin
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    ) THEN
      -- L'utilisateur n'est pas admin, bloquer la modification
      RAISE EXCEPTION 'Permission denied: Only administrators can modify admin status. Attempted by user: %', auth.uid();
    END IF;
    
    -- Log de sécurité (optionnel mais recommandé)
    RAISE NOTICE 'Admin status modified for user % by admin %', NEW.id, auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS protect_is_admin_modification ON public.profiles;

CREATE TRIGGER protect_is_admin_modification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_is_admin_self_modification();

-- Commentaires pour documentation
COMMENT ON FUNCTION prevent_is_admin_self_modification() IS 
'Sécurité critique: Empêche les utilisateurs de se donner eux-mêmes les privilèges administrateur. Seuls les admins existants peuvent modifier is_admin.';

COMMENT ON TRIGGER protect_is_admin_modification ON public.profiles IS
'Trigger de sécurité: Bloque toute tentative de modification non autorisée de la colonne is_admin';

-- ============================================
-- TEST DE SÉCURITÉ
-- ============================================

-- Test 1: Utilisateur normal essaie de devenir admin (DOIT ÉCHOUER)
-- UPDATE profiles SET is_admin = true WHERE id = auth.uid();
-- Résultat attendu: ERROR: Permission denied

-- Test 2: Admin modifie le statut d'un autre utilisateur (DOIT RÉUSSIR)
-- UPDATE profiles SET is_admin = true WHERE id = '<autre-user-id>';
-- Résultat attendu: SUCCESS (si exécuté par un admin)

-- Test 3: Admin modifie son propre statut (DOIT RÉUSSIR)
-- UPDATE profiles SET is_admin = false WHERE id = auth.uid();
-- Résultat attendu: SUCCESS (si is_admin = true avant)

-- ============================================
-- PROTECTION SUPPLÉMENTAIRE (Optionnel)
-- ============================================

-- Créer une table d'audit pour tracker les changements is_admin
CREATE TABLE IF NOT EXISTS public.admin_status_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL REFERENCES auth.users(id),
  modified_by uuid NOT NULL REFERENCES auth.users(id),
  old_value boolean NOT NULL,
  new_value boolean NOT NULL,
  modified_at timestamp with time zone DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_status_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_date ON public.admin_status_audit(modified_at DESC);

-- RLS pour la table d'audit (seuls les admins peuvent voir)
ALTER TABLE public.admin_status_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
  ON public.admin_status_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Fonction pour logger les changements is_admin
CREATE OR REPLACE FUNCTION log_admin_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    INSERT INTO public.admin_status_audit (
      target_user_id,
      modified_by,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.is_admin,
      NEW.is_admin
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger d'audit (s'exécute APRÈS le trigger de protection)
DROP TRIGGER IF EXISTS audit_admin_status_changes ON public.profiles;

CREATE TRIGGER audit_admin_status_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_status_change();

COMMENT ON TABLE public.admin_status_audit IS 
'Audit log: Enregistre tous les changements de statut administrateur pour la sécurité et la traçabilité';

-- ============================================
-- VÉRIFICATION DE LA MIGRATION
-- ============================================

-- Lister tous les admins actuels
-- SELECT id, email, is_admin, created_at 
-- FROM profiles 
-- WHERE is_admin = true 
-- ORDER BY created_at;

-- Vérifier que les triggers sont actifs
-- SELECT 
--   trigger_name, 
--   event_manipulation, 
--   action_timing,
--   action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'profiles'
-- AND trigger_name LIKE '%admin%';
