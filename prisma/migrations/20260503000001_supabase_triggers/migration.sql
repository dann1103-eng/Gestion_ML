-- Trigger: cuando se crea un usuario en auth.users, copiar a public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', SPLIT_PART(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS: storage.objects para bucket 'adjuntos'
-- (ejecutar después de crear el bucket en el dashboard de Supabase)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'adjuntos_authenticated_all'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY adjuntos_authenticated_all
        ON storage.objects FOR ALL TO authenticated
        USING (bucket_id IN ('adjuntos', 'plantillas', 'generados'))
        WITH CHECK (bucket_id IN ('adjuntos', 'plantillas', 'generados'))
    $POL$;
  END IF;
END;
$$;
