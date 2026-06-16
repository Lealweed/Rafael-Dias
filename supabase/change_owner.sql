-- change_owner.sql
-- Substitua your_owner_role pelo papel (role) que deve ser owner das tabelas
-- Execute este arquivo usando um superuser ou a conta atual do owner.

BEGIN;

-- REPLACE your_owner_role abaixo pelo role que será owner (sem aspas),
-- ou use "role_com_aspas" se necessário.
ALTER TABLE IF EXISTS public.leads OWNER TO your_owner_role;
ALTER TABLE IF EXISTS public.conversations OWNER TO your_owner_role;
ALTER TABLE IF EXISTS public.followups OWNER TO your_owner_role;
ALTER TABLE IF EXISTS public.pipeline_stages OWNER TO your_owner_role;
ALTER TABLE IF EXISTS public.appointments OWNER TO your_owner_role;
ALTER TABLE IF EXISTS public.patient_records OWNER TO your_owner_role;
ALTER TABLE IF EXISTS public.patient_financials OWNER TO your_owner_role;
ALTER TABLE IF EXISTS public.site_settings OWNER TO your_owner_role;
ALTER TABLE IF EXISTS public.messages OWNER TO your_owner_role;
ALTER TABLE IF EXISTS public.pipeline_events OWNER TO your_owner_role;

COMMIT;
