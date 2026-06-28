
-- Migration: Fix Storage RLS Policies for Admin/Staff Uploads
-- This script ensures that the required buckets exist and have correct RLS policies.

-- 1. Ensure Buckets Exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('work-reports', 'work-reports', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('house-images', 'house-images', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('marketplace-images', 'marketplace-images', true) 
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (Commented out as it may require owner permissions)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. SELECT: Allow public read access to these buckets
-- This is necessary for customers to see the photos in LINE and the Dashboard
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id IN ('images', 'work-reports', 'pos_menu_images', 'house-images', 'marketplace-images')
);

-- 4. INSERT: Allow authenticated users with admin/staff role to upload
-- Uses the helper function public.is_admin_or_staff() defined in the main schema
DROP POLICY IF EXISTS "Staff Upload Access" ON storage.objects;
CREATE POLICY "Staff Upload Access" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('images', 'work-reports', 'pos_menu_images', 'house-images', 'marketplace-images')
  AND (public.is_admin_or_staff())
);

-- 5. UPDATE/DELETE: Allow authenticated users with admin/staff role to manage files
DROP POLICY IF EXISTS "Staff Manage Access" ON storage.objects;
CREATE POLICY "Staff Manage Access" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id IN ('images', 'work-reports', 'pos_menu_images', 'house-images', 'marketplace-images')
  AND (public.is_admin_or_staff())
);

-- 6. Special Case: Allow customers to upload to their own folder in house-images
-- (Optional, since the current API uses service_role, but good for future browser-side usage)
DROP POLICY IF EXISTS "Customers can upload own house images" ON storage.objects;
CREATE POLICY "Customers can upload own house images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'house-images'
  AND (SUBSTRING(name FROM 1 FOR 36) = auth.uid()::text)
);
