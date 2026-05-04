-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  summary JSONB,
  questions JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own documents" ON public.documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own documents" ON public.documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own documents" ON public.documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_documents_user_id ON public.documents(user_id, created_at DESC);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

CREATE POLICY "Users upload own pdfs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users read own pdfs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own pdfs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);