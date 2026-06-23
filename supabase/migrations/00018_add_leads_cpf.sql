-- 00018_add_leads_cpf.sql
-- Permite armazenar CPF diretamente no cadastro do paciente quando a migração for aplicada.

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS cpf TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_cpf ON public.leads (cpf);
