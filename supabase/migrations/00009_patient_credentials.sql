-- 00009_patient_credentials.sql
-- Add credentials and configuration checkboxes for patient portal access

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS portal_password VARCHAR(6),
ADD COLUMN IF NOT EXISTS portal_access_active BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS whatsapp_reminders BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS allergies_restrictions TEXT;
