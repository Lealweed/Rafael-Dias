-- 00021_marketing_campaigns.sql

-- ==========================================
-- Table: marketing_campaigns
-- ==========================================
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google_ads', 'meta_ads')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  budget NUMERIC NOT NULL DEFAULT 0.00,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- Columns: Add UTM Tracking to leads
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'utm_source'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN utm_source TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'utm_medium'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN utm_medium TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'utm_campaign'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN utm_campaign TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'utm_content'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN utm_content TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'utm_term'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN utm_term TEXT;
  END IF;
END $$;

-- ==========================================
-- Insert sample campaign records
-- ==========================================
INSERT INTO public.marketing_campaigns (id, name, platform, status, budget, impressions, clicks, cost, start_date, end_date)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Campanha Carrossel Botox 2026', 'meta_ads', 'active', 50.00, 24500, 1220, 850.50, '2026-06-01', NULL),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Bioestimuladores de Colágeno - Vídeo', 'meta_ads', 'active', 75.00, 18200, 940, 620.00, '2026-06-15', NULL),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Preenchimento Labial / Mandíbula - Pesquisa', 'google_ads', 'active', 100.00, 8900, 1050, 1240.20, '2026-06-05', NULL),
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Clínica Harmonização Facial Parauapebas', 'google_ads', 'active', 80.00, 12000, 1350, 980.10, '2026-06-01', NULL),
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'Rinomodelação - Antes e Depois', 'meta_ads', 'paused', 40.00, 15000, 650, 450.00, '2026-05-10', '2026-06-10')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  platform = EXCLUDED.platform,
  status = EXCLUDED.status,
  budget = EXCLUDED.budget,
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  cost = EXCLUDED.cost;

-- ==========================================
-- Insert sample leads mapped to UTM campaigns
-- ==========================================
INSERT INTO public.leads (full_name, phone, email, origin, main_interest, temperature, conversation_status, utm_source, utm_medium, utm_campaign, utm_content, created_at)
VALUES
  ('Juliana Ribeiro', '11988887701', 'juliana.rib@example.com', 'Meta Ads', 'Toxina Botulínica', 'hot', 'agendado', 'meta', 'cpc', 'Campanha Carrossel Botox 2026', 'carrossel_mulher_30', now() - interval '8 days'),
  ('Carla Souza', '11988887702', 'carla.souza@example.com', 'Meta Ads', 'Toxina Botulínica', 'warm', 'em_atendimento', 'meta', 'cpc', 'Campanha Carrossel Botox 2026', 'carrossel_mulher_30', now() - interval '7 days'),
  ('Aline Mendes', '11988887703', 'aline.mendes@example.com', 'Meta Ads', 'Toxina Botulínica', 'cold', 'novo', 'meta', 'cpc', 'Campanha Carrossel Botox 2026', 'banner_gold_desconto', now() - interval '6 days'),
  
  ('Mariana Ferreira', '11988887704', 'mariana.ferr@example.com', 'Meta Ads', 'Bioestimuladores', 'hot', 'agendado', 'meta', 'cpc', 'Bioestimuladores de Colágeno - Vídeo', 'video_explicativo_dr', now() - interval '5 days'),
  ('Renata Santos', '11988887705', 'renata.santos@example.com', 'Meta Ads', 'Bioestimuladores', 'warm', 'em_followup', 'meta', 'cpc', 'Bioestimuladores de Colágeno - Vídeo', 'video_explicativo_dr', now() - interval '4 days'),

  ('Beatriz Costa', '11988887706', 'beatriz.costa@example.com', 'Google Ads', 'Preenchimento Labial', 'hot', 'encerrado', 'google', 'cpc', 'Preenchimento Labial / Mandíbula - Pesquisa', 'ad_harmonizacao_sulco', now() - interval '12 days'),
  ('Camila Pires', '11988887707', 'camila.pires@example.com', 'Google Ads', 'Preenchimento Labial', 'hot', 'agendado', 'google', 'cpc', 'Preenchimento Labial / Mandíbula - Pesquisa', 'ad_harmonizacao_sulco', now() - interval '10 days'),
  ('Débora Almeida', '11988887708', 'debora.almeida@example.com', 'Google Ads', 'Preenchimento Mandibular', 'warm', 'em_atendimento', 'google', 'cpc', 'Preenchimento Labial / Mandíbula - Pesquisa', 'ad_mandibula_contorno', now() - interval '5 days'),

  ('Gabriela Lima', '11988887709', 'gabriela.lima@example.com', 'Google Ads', 'Harmonização Facial', 'hot', 'agendado', 'google', 'cpc', 'Clínica Harmonização Facial Parauapebas', 'ad_clinica_rafaeldias', now() - interval '14 days'),
  ('Patrícia Rocha', '11988887710', 'patricia.rocha@example.com', 'Google Ads', 'Harmonização Facial', 'warm', 'aguardando_cliente', 'google', 'cpc', 'Clínica Harmonização Facial Parauapebas', 'ad_clinica_rafaeldias', now() - interval '9 days'),
  ('Sofia Albuquerque', '11988887711', 'sofia.albu@example.com', 'Google Ads', 'Harmonização Facial', 'cold', 'novo', 'google', 'cpc', 'Clínica Harmonização Facial Parauapebas', 'ad_clinica_rafaeldias', now() - interval '2 days'),

  ('Isabela Ramos', '11988887712', 'isabela.ramos@example.com', 'Meta Ads', 'Rinomodelação', 'cold', 'encerrado', 'meta', 'cpc', 'Rinomodelação - Antes e Depois', 'imagem_antes_depois', now() - interval '20 days')
ON CONFLICT (phone) DO NOTHING;

-- ==========================================
-- RLS and Grants
-- ==========================================
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select for authenticated users on marketing_campaigns" 
ON public.marketing_campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all actions for service_role on marketing_campaigns" 
ON public.marketing_campaigns FOR ALL TO service_role USING (true);

GRANT SELECT ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;
