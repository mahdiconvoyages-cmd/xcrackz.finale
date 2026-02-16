-- Migration: Mise à jour RLS pour accès public aux disponibilités
-- Date: 2025-10-11
-- Description: 
--   1. Supprime les anciennes politiques RLS restrictives
--   2. Crée nouvelles politiques pour accès libre (lecture publique)
--   3. Seule l'écriture reste limitée au propriétaire

-- =====================================================
-- 1. SUPPRESSION DES ANCIENNES POLITIQUES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own availability" ON availability_calendar;
DROP POLICY IF EXISTS "Users can view contacts availability with access" ON availability_calendar;
DROP POLICY IF EXISTS "Users can insert their own availability" ON availability_calendar;
DROP POLICY IF EXISTS "Users can update their own availability" ON availability_calendar;
DROP POLICY IF EXISTS "Users can delete their own availability" ON availability_calendar;

-- Suppression de la vue avec filtre has_calendar_access
DROP VIEW IF EXISTS contact_availability;

-- =====================================================
-- 2. NOUVELLES POLITIQUES RLS (ACCÈS LIBRE EN LECTURE)
-- =====================================================

-- Politique 1: Tout le monde peut voir les disponibilités de tout le monde (lecture publique)
CREATE POLICY "Anyone can view all availabilities"
  ON availability_calendar
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique 2: Les utilisateurs peuvent uniquement insérer leurs propres disponibilités
CREATE POLICY "Users can insert their own availability"
  ON availability_calendar
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politique 3: Les utilisateurs peuvent uniquement modifier leurs propres disponibilités
CREATE POLICY "Users can update their own availability"
  ON availability_calendar
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique 4: Les utilisateurs peuvent uniquement supprimer leurs propres disponibilités
CREATE POLICY "Users can delete their own availability"
  ON availability_calendar
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. NOUVELLE VUE SIMPLIFIÉE (SANS FILTRE has_calendar_access)
-- =====================================================

-- Vue simplifiée: joint tous les contacts avec toutes les disponibilités
CREATE OR REPLACE VIEW contact_availability AS
SELECT 
  c.id AS contact_id,
  c.name AS contact_name,
  c.email AS contact_email,
  c.user_id AS viewer_id,
  p.id AS profile_id,
  ac.date,
  ac.status,
  ac.start_time,
  ac.end_time,
  ac.notes,
  ac.created_at,
  ac.updated_at
FROM contacts c
LEFT JOIN profiles p ON p.email = c.email
LEFT JOIN availability_calendar ac ON ac.user_id = p.id
WHERE c.user_id = auth.uid();

-- Permissions sur la vue
GRANT SELECT ON contact_availability TO authenticated;

-- =====================================================
-- 4. COMMENTAIRES
-- =====================================================

COMMENT ON POLICY "Anyone can view all availabilities" ON availability_calendar IS 
'Permet à tous les utilisateurs authentifiés de voir toutes les disponibilités. Par défaut, si aucune entrée nexiste pour une date, lutilisateur est considéré comme disponible (vert).';

COMMENT ON VIEW contact_availability IS 
'Vue simplifiée sans filtre has_calendar_access. Tous les contacts sont visibles avec leurs disponibilités.';

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
