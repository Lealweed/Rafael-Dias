-- Migration: 00020_add_cashier_receipt_fields.sql
-- Description: Adds receipt_url columns to sales, patient_financials, cash_transactions, and cash_sessions tables.

-- 1. Add receipt_url to sales
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 2. Add receipt_url to patient_financials
ALTER TABLE public.patient_financials 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 3. Add receipt_url to cash_transactions
ALTER TABLE public.cash_transactions 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 4. Add receipt_url to cash_sessions
ALTER TABLE public.cash_sessions 
ADD COLUMN IF NOT EXISTS receipt_url TEXT;
