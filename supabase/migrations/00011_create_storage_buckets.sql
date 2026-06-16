-- 00011_create_storage_buckets.sql

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('patient-before-after', 'patient-before-after', true),
  ('patient-records', 'patient-records', false),
  ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies for patient-before-after bucket
-- ==========================================
-- Public read access for before-after photos
CREATE POLICY "Public read access to before-after photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'patient-before-after');

-- Authenticated users can upload to before-after
CREATE POLICY "Authenticated users can upload before-after"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patient-before-after');

-- Authenticated users can update their own before-after photos
CREATE POLICY "Authenticated users can update before-after"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'patient-before-after');

-- Authenticated users can delete their own before-after photos
CREATE POLICY "Authenticated users can delete before-after"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'patient-before-after');

-- ==========================================
-- RLS Policies for patient-records bucket
-- ==========================================
-- Only authenticated users can read patient records
CREATE POLICY "Authenticated users can read patient records"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'patient-records');

-- Authenticated users can upload patient records
CREATE POLICY "Authenticated users can upload patient records"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patient-records');

-- Authenticated users can update patient records
CREATE POLICY "Authenticated users can update patient records"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'patient-records');

-- Authenticated users can delete patient records
CREATE POLICY "Authenticated users can delete patient records"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'patient-records');

-- ==========================================
-- RLS Policies for site-assets bucket
-- ==========================================
-- Public read access to site assets
CREATE POLICY "Public read access to site assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

-- Authenticated users can upload to site-assets
CREATE POLICY "Authenticated users can upload site assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets');

-- Authenticated users can update site assets
CREATE POLICY "Authenticated users can update site assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-assets');

-- Authenticated users can delete site assets
CREATE POLICY "Authenticated users can delete site assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-assets');
