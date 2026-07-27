CREATE INDEX IF NOT EXISTS meeting_attendees_user_id_idx ON public.meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS meetings_club_starts_idx ON public.meetings(club_id, starts_at);