CREATE OR REPLACE FUNCTION public.trip_traveler_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.trip_flight_passengers p
  WHERE p.user_id = OLD.user_id
    AND p.flight_id IN (SELECT f.id FROM public.trip_flights f WHERE f.trip_id = OLD.trip_id);

  DELETE FROM public.trip_flight_baggage_handlers b
  WHERE b.user_id = OLD.user_id
    AND b.flight_id IN (SELECT f.id FROM public.trip_flights f WHERE f.trip_id = OLD.trip_id);

  DELETE FROM public.trip_boarding_passes bp
  WHERE bp.user_id = OLD.user_id
    AND bp.flight_id IN (SELECT f.id FROM public.trip_flights f WHERE f.trip_id = OLD.trip_id);

  DELETE FROM public.trip_transport_passengers tp
  WHERE tp.user_id = OLD.user_id
    AND tp.transport_id IN (SELECT tr.id FROM public.trip_transports tr WHERE tr.trip_id = OLD.trip_id);

  DELETE FROM public.trip_room_occupants o
  WHERE o.user_id = OLD.user_id
    AND o.room_id IN (
      SELECT r.id FROM public.trip_rooms r
      JOIN public.trip_hotels h ON h.id = r.hotel_id
      WHERE h.trip_id = OLD.trip_id
    );

  UPDATE public.trip_luggage l
  SET responsible_user_id = NULL
  WHERE l.trip_id = OLD.trip_id AND l.responsible_user_id = OLD.user_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trip_travelers_cleanup_after_delete ON public.trip_travelers;
CREATE TRIGGER trip_travelers_cleanup_after_delete
AFTER DELETE ON public.trip_travelers
FOR EACH ROW EXECUTE FUNCTION public.trip_traveler_cleanup();

-- Limpieza única de huérfanos existentes
DELETE FROM public.trip_flight_passengers p
USING public.trip_flights f
WHERE f.id = p.flight_id
  AND NOT EXISTS (SELECT 1 FROM public.trip_travelers t WHERE t.trip_id = f.trip_id AND t.user_id = p.user_id);

DELETE FROM public.trip_flight_baggage_handlers b
USING public.trip_flights f
WHERE f.id = b.flight_id
  AND NOT EXISTS (SELECT 1 FROM public.trip_travelers t WHERE t.trip_id = f.trip_id AND t.user_id = b.user_id);

DELETE FROM public.trip_boarding_passes bp
USING public.trip_flights f
WHERE f.id = bp.flight_id
  AND NOT EXISTS (SELECT 1 FROM public.trip_travelers t WHERE t.trip_id = f.trip_id AND t.user_id = bp.user_id);

DELETE FROM public.trip_transport_passengers tp
USING public.trip_transports tr
WHERE tr.id = tp.transport_id
  AND NOT EXISTS (SELECT 1 FROM public.trip_travelers t WHERE t.trip_id = tr.trip_id AND t.user_id = tp.user_id);

DELETE FROM public.trip_room_occupants o
USING public.trip_rooms r
JOIN public.trip_hotels h ON h.id = r.hotel_id
WHERE r.id = o.room_id
  AND NOT EXISTS (SELECT 1 FROM public.trip_travelers t WHERE t.trip_id = h.trip_id AND t.user_id = o.user_id);

UPDATE public.trip_luggage l
SET responsible_user_id = NULL
WHERE l.responsible_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.trip_travelers t WHERE t.trip_id = l.trip_id AND t.user_id = l.responsible_user_id);