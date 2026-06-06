DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'source'
  ) THEN
    ALTER TABLE public.messages
      ADD COLUMN source TEXT NOT NULL DEFAULT 'customer';
  END IF;
END $$;

UPDATE public.messages
SET source = CASE
  WHEN type = 'system' THEN 'system'
  WHEN direction = 'inbound' THEN 'customer'
  ELSE 'agent'
END
WHERE source IS NULL OR source = '';

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_source_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_source_check
  CHECK (source IN ('customer', 'human', 'agent', 'system'));
