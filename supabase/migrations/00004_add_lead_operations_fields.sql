DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'conversation_status'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN conversation_status TEXT NOT NULL DEFAULT 'novo';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN owner_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN owner_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'next_followup_at'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN next_followup_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'calendar_event_id'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN calendar_event_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'last_appointment_at'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN last_appointment_at TIMESTAMPTZ;
  END IF;
END $$;

UPDATE public.leads
SET conversation_status = 'novo'
WHERE conversation_status IS NULL;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_conversation_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_conversation_status_check
  CHECK (conversation_status IN ('novo', 'em_atendimento', 'aguardando_cliente', 'agendado', 'em_followup', 'encerrado'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'leads'
      AND constraint_name = 'leads_owner_id_fkey'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_owner_id_fkey
      FOREIGN KEY (owner_id)
      REFERENCES public.profiles(id);
  END IF;
END $$;
