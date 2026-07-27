ALTER TABLE public.inventory_loans
  ADD CONSTRAINT inventory_loans_borrower_user_id_profiles_fkey
  FOREIGN KEY (borrower_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;