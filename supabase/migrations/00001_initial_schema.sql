-- Enum Types
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'agent');
CREATE TYPE public.lead_temperature AS ENUM ('hot', 'warm', 'cold');
CREATE TYPE public.message_type AS ENUM ('text', 'audio', 'image', 'document', 'system');
CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.followup_status AS ENUM ('pending', 'completed', 'postponed', 'canceled');
CREATE TYPE public.integration_status AS ENUM ('pending', 'success', 'failed');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role public.user_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pipeline Stages
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tto_order INTEGER NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE, -- E.164
  email TEXT,
  origin TEXT,
  main_interest TEXT,
  notes TEXT,
  temperature public.lead_temperature DEFAULT 'cold',
  stage_id UUID REFERENCES public.pipeline_stages(id),
  owner_id UUID REFERENCES public.profiles(id),
  loss_reason TEXT,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Lead Tags
CREATE TABLE public.lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Tag Relations
CREATE TABLE public.lead_tag_rel (
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.lead_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id), -- Null se for o lead
  direction public.message_direction NOT NULL,
  type public.message_type NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  n8n_message_id TEXT, -- Para idempotência
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Follow-ups
CREATE TABLE public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  status public.followup_status DEFAULT 'pending',
  type TEXT, -- ex: 'short_return', 'commercial_return', 'reactivation'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pipeline Events (Audit de mudança de estágio)
CREATE TABLE public.pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id),
  changed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Appointments (Consultas/Agendamentos)
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, canceled, no_show
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Integration Events (Logs de Webhooks do n8n)
CREATE TABLE public.integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'inbound_message', 'outbound_webhook', etc.
  direction public.message_direction NOT NULL,
  payload JSONB NOT NULL,
  status public.integration_status DEFAULT 'pending',
  error_message TEXT,
  event_id TEXT UNIQUE, -- para idempotência
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Audit Logs (Ações sensíveis)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tag_rel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security Policies (Exemplos básicos)
-- Profiles: Usuários podem ver perfis. Apenas admins atualizam papéis
CREATE POLICY "Profiles viewable by internal users" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can edit own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Leads: Todos os usuários autenticados vêm e editam leads (Gestão de acesso mais refinada pode ser adicionada depois)
CREATE POLICY "Leads viewable by authenticated users" ON public.leads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Leads insertable by authenticated users" ON public.leads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Leads updatable by authenticated users" ON public.leads FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Demais tabelas: acesso geral para usuários autenticados na Fase 1 (melhoramento no hardening - Fase 4)
CREATE POLICY "Authenticated users full access" ON public.conversations FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users full access" ON public.messages FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users full access" ON public.followups FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users full access" ON public.pipeline_stages FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users full access" ON public.pipeline_events FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users full access" ON public.appointments FOR ALL USING (auth.uid() IS NOT NULL);

-- Tratamento automático de timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_leads BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_conversations BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_followups BEFORE UPDATE ON public.followups FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_pipeline_stages BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger na tabela de auth.users para criar automaticamente uma entrada no `profiles`
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'agent');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
