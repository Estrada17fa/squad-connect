ALTER TABLE public.medical_appointments
  ADD CONSTRAINT medical_appointments_player_user_id_fkey
  FOREIGN KEY (player_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;