-- Migration: Create review-images storage bucket
-- Purpose: Allow users to upload review photos when submitting product reviews

-- Step 1: Create the review-images bucket (public, max 5MB per file)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Allow authenticated users to upload review images
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'review-images');

-- Step 3: Allow anyone to view review images (public bucket)
CREATE POLICY "Anyone can view review images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'review-images');

-- Step 4: Allow authenticated users to update their review images
CREATE POLICY "Authenticated users can update review images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'review-images');

-- Step 5: Allow authenticated users to delete review images
CREATE POLICY "Authenticated users can delete review images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'review-images');
