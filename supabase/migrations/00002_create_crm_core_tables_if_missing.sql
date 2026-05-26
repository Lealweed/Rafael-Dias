-- Create core CRM objects safely when schema is partially missing.
-- Can be executed in Supabase SQL Editor.

create extension if not exists pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_temperature') THEN
    CREATE TYPE public.lead_temperature AS ENUM ('hot', 'warm', 'cold');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE public.message_type AS ENUM ('text', 'audio', 'image', 'document', 'system');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_direction') THEN
    CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status') THEN
    CREATE TYPE public.integration_status AS ENUM ('pending', 'success', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  phone TEXT UNIQUE,
  email TEXT,
  origin TEXT,
  main_interest TEXT,
  notes TEXT,
  temperature public.lead_temperature DEFAULT 'cold',
  loss_reason TEXT,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID,
  direction public.message_direction NOT NULL DEFAULT 'inbound',
  type public.message_type NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  n8n_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  direction public.message_direction NOT NULL,
  payload JSONB NOT NULL,
  status public.integration_status DEFAULT 'pending',
  error_message TEXT,
  event_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Leads viewable by authenticated users'
  ) THEN
    CREATE POLICY "Leads viewable by authenticated users"
      ON public.leads FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Leads insertable by authenticated users'
  ) THEN
    CREATE POLICY "Leads insertable by authenticated users"
      ON public.leads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leads' AND policyname = 'Leads updatable by authenticated users'
  ) THEN
    CREATE POLICY "Leads updatable by authenticated users"
      ON public.leads FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Authenticated users full access conversations'
  ) THEN
    CREATE POLICY "Authenticated users full access conversations"
      ON public.conversations FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Authenticated users full access messages'
  ) THEN
    CREATE POLICY "Authenticated users full access messages"
      ON public.messages FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'integration_events' AND policyname = 'Authenticated users full access integration_events'
  ) THEN
    CREATE POLICY "Authenticated users full access integration_events"
      ON public.integration_events FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_leads ON public.leads;
CREATE TRIGGER set_timestamp_leads
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_conversations ON public.conversations;
CREATE TRIGGER set_timestamp_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();
