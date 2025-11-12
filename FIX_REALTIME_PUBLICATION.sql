-- ============================================
-- FIX REALTIME: Activer realtime sur tables manquantes
-- Résout les erreurs CHANNEL_ERROR / CLOSED des subscriptions
-- ============================================

-- Vérifier et ajouter missions à la publication realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'missions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
    RAISE NOTICE 'Table missions ajoutée à supabase_realtime';
  ELSE
    RAISE NOTICE 'Table missions déjà dans supabase_realtime';
  END IF;
END $$;

-- Vérifier et ajouter vehicle_inspections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'vehicle_inspections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_inspections;
    RAISE NOTICE 'Table vehicle_inspections ajoutée à supabase_realtime';
  ELSE
    RAISE NOTICE 'Table vehicle_inspections déjà dans supabase_realtime';
  END IF;
END $$;

-- Note: inspection_photos est une VIEW, pas une table - ne peut pas être ajoutée à realtime
-- Si vous avez besoin de realtime sur les photos, activez-le sur la table sous-jacente

-- Vérifier et ajouter profiles (pour synchronisation crédits/statuts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    RAISE NOTICE 'Table profiles ajoutée à supabase_realtime';
  ELSE
    RAISE NOTICE 'Table profiles déjà dans supabase_realtime';
  END IF;
END $$;

-- Vérifier et ajouter mission_assignments (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'mission_assignments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mission_assignments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_assignments;
      RAISE NOTICE 'Table mission_assignments ajoutée à supabase_realtime';
    ELSE
      RAISE NOTICE 'Table mission_assignments déjà dans supabase_realtime';
    END IF;
  ELSE
    RAISE NOTICE 'Table mission_assignments n''existe pas';
  END IF;
END $$;

-- Vérifier et ajouter carpooling_offers (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'carpooling_offers'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'carpooling_offers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.carpooling_offers;
      RAISE NOTICE 'Table carpooling_offers ajoutée à supabase_realtime';
    ELSE
      RAISE NOTICE 'Table carpooling_offers déjà dans supabase_realtime';
    END IF;
  ELSE
    RAISE NOTICE 'Table carpooling_offers n''existe pas';
  END IF;
END $$;

-- Vérifier et ajouter carpooling_bookings (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'carpooling_bookings'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'carpooling_bookings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.carpooling_bookings;
      RAISE NOTICE 'Table carpooling_bookings ajoutée à supabase_realtime';
    ELSE
      RAISE NOTICE 'Table carpooling_bookings déjà dans supabase_realtime';
    END IF;
  ELSE
    RAISE NOTICE 'Table carpooling_bookings n''existe pas';
  END IF;
END $$;

-- Afficher la liste complète des tables dans la publication
SELECT 
  schemaname, 
  tablename,
  'Realtime activé' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

-- Vérifier que la réplication est bien activée
SELECT 
  CASE 
    WHEN current_setting('wal_level') = 'logical' THEN '✅ WAL level correct (logical)'
    ELSE '⚠️ WAL level incorrect: ' || current_setting('wal_level')
  END as wal_status;
