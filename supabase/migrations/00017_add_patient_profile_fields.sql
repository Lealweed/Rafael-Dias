-- Migration: 00017_add_patient_profile_fields.sql

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS trust_phone TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT;
