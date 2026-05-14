-- Enable REPLICA IDENTITY FULL on tables used in Realtime subscriptions
-- so that DELETE events include the full old row (not just the primary key).
ALTER TABLE public.tags REPLICA IDENTITY FULL;
ALTER TABLE public.note_links REPLICA IDENTITY FULL;

-- Add tables to the Supabase Realtime publication.
-- Without this, postgres_changes subscriptions receive no events.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_links;
