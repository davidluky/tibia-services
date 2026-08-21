-- ============================================================
-- Realtime Messages Publication (2026-07-25)
-- BookingThread subscribes to postgres_changes on public.messages
-- for in-booking chat. postgres_changes only fires for tables in
-- the supabase_realtime publication, which until now was a
-- dashboard toggle no migration or setup step ever set — so chat
-- delivery was not reproducible from this repo.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE NOTICE 'supabase_realtime publication not found; skipping (non-Supabase database)';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    RETURN;
  END IF;

  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
END;
$$;
