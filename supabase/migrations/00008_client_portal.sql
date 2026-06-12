-- 00008_client_portal.sql
-- Migration to support Client Portal & Gestão Estética

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

-- Enable RLS for patient_records
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to patient_records" 
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
    payment_method VARCHAR(50) NOT NULL, -- 'boleto', 'cartao', 'pix', 'dinheiro'
    installments JSONB DEFAULT '[]'::jsonb, -- Array of installments: [{number, due_date, value, status}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for patient_financials
ALTER TABLE public.patient_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to patient_financials" 
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

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to notifications" 
ON public.notifications FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
