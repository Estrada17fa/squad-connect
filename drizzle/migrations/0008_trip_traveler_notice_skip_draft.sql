CREATE OR REPLACE FUNCTION public.notify_trip_traveler()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE t RECORD;
BEGIN
  SELECT club_id, title, destination, departure_at, status INTO t FROM public.trips WHERE id = NEW.trip_id;
  IF t IS NULL OR t.status = 'planeacion' THEN RETURN NEW; END IF;
  PERFORM public.notify_users(
    t.club_id, ARRAY[NEW.user_id], 'viaje_convocatoria',
    'Fuiste convocado al viaje a ' || COALESCE(t.destination, t.title),
    'Salida: ' || to_char(t.departure_at AT TIME ZONE 'America/Mazatlan', 'DD/MM HH24:MI'),
    'viajes', NEW.trip_id);
  RETURN NEW;
END;
$function$;