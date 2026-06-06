DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'appointment_status'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN appointment_status TEXT NOT NULL DEFAULT 'scheduled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'appointment_confirmed_at'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN appointment_confirmed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'last_confirmation_sent_at'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN last_confirmation_sent_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'last_reminder_sent_at'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN last_reminder_sent_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'last_no_show_check_sent_at'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN last_no_show_check_sent_at TIMESTAMPTZ;
  END IF;
END $$;

UPDATE public.leads
SET appointment_status = 'scheduled'
WHERE appointment_status IS NULL;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_appointment_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_appointment_status_check
  CHECK (appointment_status IN ('scheduled', 'pending_confirmation', 'confirmed', 'completed', 'no_show', 'canceled', 'rescheduled'));
