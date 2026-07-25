-- 1. Rename system role Utilero -> Staff (id preserved, permissions and memberships kept)
UPDATE public.roles SET name = 'Staff' WHERE name = 'Utilero' AND is_system_default = true;

-- 2. Add informational job_title on team_memberships
ALTER TABLE public.team_memberships ADD COLUMN IF NOT EXISTS job_title text;