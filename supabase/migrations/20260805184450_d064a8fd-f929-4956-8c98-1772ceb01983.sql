REVOKE ALL ON FUNCTION public.notify_users(uuid, uuid[], text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notifications_push_hook(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_due_loans() FROM PUBLIC, anon, authenticated;