DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname, rel.relname AS tbl,
           (SELECT a.attname FROM unnest(con.conkey) k JOIN pg_attribute a ON a.attrelid = rel.oid AND a.attnum = k LIMIT 1) AS col
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace AND n.nspname = 'public'
      JOIN pg_class fr ON fr.oid = con.confrelid
      JOIN pg_namespace fn ON fn.oid = fr.relnamespace
     WHERE con.contype = 'f'
       AND con.confdeltype = 'a'
       AND ((fn.nspname = 'auth' AND fr.relname = 'users') OR (fn.nspname = 'public' AND fr.relname = 'profiles'))
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.profiles(id) ON DELETE SET NULL', r.tbl, r.conname, r.col);
  END LOOP;
END $$;