-- Add base_role to roles (for UI navigation grouping only; not a security field)
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS base_role TEXT;

-- Backfill: system roles use their own name (lowercased, ascii); custom roles default to 'staff'
UPDATE public.roles
SET base_role = CASE
  WHEN is_system_default AND lower(name) = 'admin'    THEN 'admin'
  WHEN is_system_default AND lower(name) = 'técnico'  THEN 'tecnico'
  WHEN is_system_default AND lower(name) = 'tecnico'  THEN 'tecnico'
  WHEN is_system_default AND lower(name) = 'médico'   THEN 'medico'
  WHEN is_system_default AND lower(name) = 'medico'   THEN 'medico'
  WHEN is_system_default AND lower(name) = 'staff'    THEN 'staff'
  WHEN is_system_default AND lower(name) = 'utilero'  THEN 'staff'
  WHEN is_system_default AND lower(name) = 'jugador'  THEN 'jugador'
  ELSE 'staff'
END
WHERE base_role IS NULL;

ALTER TABLE public.roles
  ALTER COLUMN base_role SET DEFAULT 'staff',
  ALTER COLUMN base_role SET NOT NULL;

-- Constrain to known values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roles_base_role_check'
  ) THEN
    ALTER TABLE public.roles
      ADD CONSTRAINT roles_base_role_check
      CHECK (base_role IN ('admin','tecnico','medico','staff','jugador'));
  END IF;
END $$;