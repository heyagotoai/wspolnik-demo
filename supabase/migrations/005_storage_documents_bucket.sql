-- ============================================
-- WM GABI - Supabase Storage: bucket "documents"
-- Migracja 005: Bucket + Storage policies
-- ============================================

-- Utwórz prywatny bucket na dokumenty (max 10MB per file)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,  -- 10 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage Policies
-- ============================================

-- Admin może uploadować pliki
CREATE POLICY "Admin uploads documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM residents
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Admin może usuwać pliki
CREATE POLICY "Admin deletes documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM residents
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Zalogowani użytkownicy mogą pobierać pliki (signed URL)
CREATE POLICY "Authenticated users read documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
  );
