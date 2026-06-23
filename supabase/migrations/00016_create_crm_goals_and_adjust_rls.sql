-- Migration: 00016_create_crm_goals_and_adjust_rls.sql

-- 1. Create crm_goals table
CREATE TABLE IF NOT EXISTS public.crm_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_type VARCHAR(50) NOT NULL, -- 'appointments', 'leads', 'revenue'
    target_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_goal_type_month_year UNIQUE (goal_type, month, year)
);

-- Enable RLS for crm_goals
ALTER TABLE public.crm_goals ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create full access for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users full access to crm_goals" ON public.crm_goals;
CREATE POLICY "Allow authenticated users full access to crm_goals" 
ON public.crm_goals FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2. Add last_human_interaction_at column to leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS last_human_interaction_at TIMESTAMPTZ;

-- 3. Hardening RLS for patient_records (restrict to agents/admins)
DROP POLICY IF EXISTS "Allow authenticated users full access to patient_records" ON public.patient_records;
DROP POLICY IF EXISTS "Allow authenticated users full access to patient_records" ON public.patient_records;

CREATE POLICY "Allow authenticated staff full access to patient_records" 
ON public.patient_records FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
  )
);

-- 4. Hardening RLS for patient_financials (restrict to agents/admins)
DROP POLICY IF EXISTS "Allow authenticated users full access to patient_financials" ON public.patient_financials;
DROP POLICY IF EXISTS "Allow authenticated users full access to patient_financials" ON public.patient_financials;

CREATE POLICY "Allow authenticated staff full access to patient_financials" 
ON public.patient_financials FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
  )
);

-- 5. Hardening RLS for notifications (restrict to agents/admins)
DROP POLICY IF EXISTS "Allow authenticated users full access to notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated users full access to notifications" ON public.notifications;

CREATE POLICY "Allow authenticated staff full access to notifications" 
ON public.notifications FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'agent')
  )
);
