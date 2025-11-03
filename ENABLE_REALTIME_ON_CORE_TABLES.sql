-- Enable Supabase Realtime on core tables (safe, idempotent-ish)
-- Run this in the SQL editor on your Supabase project.

-- Add tables to the supabase_realtime publication if they exist
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.missions';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_inspections';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.inspection_photos';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.inspection_photos_v2';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credits';
EXCEPTION WHEN others THEN NULL; END $$;

-- Optional: include any other tables you want realtime on
-- DO $$ BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_logs'; EXCEPTION WHEN others THEN NULL; END $$;

-- If you need OLD row data on UPDATE/DELETE events, set REPLICA IDENTITY FULL
-- Not required if you only trigger a fresh reload, but useful for precise diffs.
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.missions REPLICA IDENTITY FULL';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.vehicle_inspections REPLICA IDENTITY FULL';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.support_conversations REPLICA IDENTITY FULL';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.support_messages REPLICA IDENTITY FULL';
EXCEPTION WHEN others THEN NULL; END $$;

-- Notes:
-- 1) Realtime respects RLS. Ensure your policies allow SELECT for the rows users should receive.
-- 2) You can also enable Realtime per-table in the Supabase Dashboard (Table editor → Realtime → Enable).
-- 3) After running, reconnect clients or wait a few seconds for subscriptions to start receiving events.
