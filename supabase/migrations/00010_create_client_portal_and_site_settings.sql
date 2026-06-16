-- 00010_create_client_portal_and_site_settings.sql

-- Create patient_records (Prontuário Estético)
CREATE TABLE IF NOT EXISTS public.patient_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    evolution_notes TEXT,
    before_after_photos JSONB DEFAULT '[]'::jsonb,
    facial_mapping JSONB DEFAULT '{}'::jsonb,
    post_recommendations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow authenticated users full access to patient_records"
  ON public.patient_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create patient_financials (Financeiro Manual)
CREATE TABLE IF NOT EXISTS public.patient_financials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    total_value NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    installments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.patient_financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow authenticated users full access to patient_financials"
  ON public.patient_financials FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create notifications (Central de Notificações)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow authenticated users full access to notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add patient portal fields to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS portal_password VARCHAR(6),
  ADD COLUMN IF NOT EXISTS portal_access_active BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_reminders BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS allergies_restrictions TEXT;

-- Create pipeline stages table
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tto_order INTEGER NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated users full access" ON public.pipeline_stages FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Create followups table
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated users full access" ON public.followups FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated users full access" ON public.appointments FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Create app_settings / site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Authenticated users full access" ON public.site_settings FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
