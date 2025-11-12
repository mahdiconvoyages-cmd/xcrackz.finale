-- ============================================
-- SHARE CODE BACKFILL + TRIGGER AUTO-GENERATE
-- Assure la présence de share_code, génération unique pour existants,
-- et trigger d'auto-génération pour les futures missions.
-- ============================================

-- 1) Ajouter colonne share_code si manquante
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='missions' AND column_name='share_code'
  ) THEN
    ALTER TABLE public.missions ADD COLUMN share_code TEXT UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_missions_share_code ON public.missions(share_code);
  END IF;
END$$;

-- 2) Fonction generate_share_code (remplace/garantit présence)
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sans I,O,0,1
  code TEXT;
BEGIN
  -- Préfixe XZ- puis 6 caractères (ABC-123)
  code := 'XZ-';
  FOR i IN 1..6 LOOP
    code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    IF i = 3 THEN
      code := code || '-';
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.generate_share_code IS 'Génère un code de partage type XZ-ABC-123';

-- 3) Trigger function d'auto-génération avant insert
CREATE OR REPLACE FUNCTION public.auto_generate_share_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  exists_code BOOLEAN;
BEGIN
  IF NEW.share_code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    new_code := public.generate_share_code();
    SELECT EXISTS(SELECT 1 FROM public.missions WHERE share_code = new_code) INTO exists_code;
    EXIT WHEN NOT exists_code;
  END LOOP;

  NEW.share_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Créer/Remplacer le trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_share_code ON public.missions;
CREATE TRIGGER trigger_auto_generate_share_code
  BEFORE INSERT ON public.missions
  FOR EACH ROW
  WHEN (NEW.share_code IS NULL)
  EXECUTE FUNCTION public.auto_generate_share_code();

-- Correction du commentaire (apostrophe doublée pour Postgres)
COMMENT ON TRIGGER trigger_auto_generate_share_code ON public.missions IS 'Génère automatiquement un code de partage à la création d''une mission';

-- 5) Backfill des missions existantes sans code
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
  exists_code BOOLEAN;
BEGIN
  FOR rec IN SELECT id FROM public.missions WHERE share_code IS NULL LOOP
    LOOP
      new_code := public.generate_share_code();
      SELECT EXISTS(SELECT 1 FROM public.missions WHERE share_code = new_code) INTO exists_code;
      EXIT WHEN NOT exists_code;
    END LOOP;

    UPDATE public.missions SET share_code = new_code, updated_at = now() WHERE id = rec.id;
  END LOOP;
END $$;

-- 6) Assurer la colonne normalisée (compat Claim)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='missions' AND column_name='normalized_share_code'
  ) THEN
    ALTER TABLE public.missions
      ADD COLUMN normalized_share_code TEXT
      GENERATED ALWAYS AS (upper(regexp_replace(share_code, '[^A-Za-z0-9]', '', 'g'))) STORED;
    CREATE INDEX IF NOT EXISTS idx_missions_normalized_share_code ON public.missions(normalized_share_code);
  END IF;
END $$;

-- 7) Notifier PostgREST
DO $$ BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload config');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
