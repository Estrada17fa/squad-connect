ALTER TABLE public.requests
  ADD CONSTRAINT requests_requester_id_profiles_fkey
    FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT requests_decided_by_profiles_fkey
    FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.request_comments
  ADD CONSTRAINT request_comments_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
