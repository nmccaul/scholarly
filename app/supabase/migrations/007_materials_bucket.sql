-- Create materials Storage bucket for PDF files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('materials', 'materials', false, 5242880, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Add pdf_storage_path to course_materials
ALTER TABLE course_materials
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;
