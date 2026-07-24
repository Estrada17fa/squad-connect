
ALTER TABLE public.task_assignees
  ADD CONSTRAINT task_assignees_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.meeting_attendees
  ADD CONSTRAINT meeting_attendees_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
