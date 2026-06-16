DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'automation_status'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN automation_status TEXT NOT NULL DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'automation_paused_at'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN automation_paused_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'automation_resumed_at'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN automation_resumed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'automation_paused_by'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN automation_paused_by UUID;
  END IF;
END $$;

UPDATE public.leads
SET automation_status = 'active'
WHERE automation_status IS NULL;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_automation_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_automation_status_check
  CHECK (automation_status IN ('active', 'paused_human', 'waiting_response', 'followup_scheduled', 'handoff_requested'));

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
      AND constraint_name = 'leads_automation_paused_by_fkey'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_automation_paused_by_fkey
      FOREIGN KEY (automation_paused_by)
      REFERENCES public.profiles(id);
  END IF;
END $$;
