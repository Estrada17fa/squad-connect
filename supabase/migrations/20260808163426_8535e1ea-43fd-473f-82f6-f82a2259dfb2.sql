-- Helpers for trips
CREATE OR REPLACE FUNCTION public.trip_team_id(_trip_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.team_id FROM public.trips t WHERE t.id = _trip_id
$$;

CREATE OR REPLACE FUNCTION public.can_view_trip_new(_user_id uuid, _trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_view_module(_user_id, 'viajes', public.trip_team_id(_trip_id))
      OR EXISTS (SELECT 1 FROM public.trip_travelers tt
                  WHERE tt.trip_id = _trip_id AND tt.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_edit_trip_new(_user_id uuid, _trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_edit_module(_user_id, 'viajes', public.trip_team_id(_trip_id))
$$;

-- ============ PLANTEL ============
DROP POLICY IF EXISTS player_profiles_select ON public.player_profiles;
DROP POLICY IF EXISTS player_profiles_insert ON public.player_profiles;
DROP POLICY IF EXISTS player_profiles_update ON public.player_profiles;
DROP POLICY IF EXISTS player_profiles_delete ON public.player_profiles;

CREATE POLICY player_profiles_select ON public.player_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_view_module(auth.uid(), 'plantel', team_id));
CREATE POLICY player_profiles_insert ON public.player_profiles FOR INSERT TO authenticated
WITH CHECK (public.can_edit_module(auth.uid(), 'plantel', team_id));
CREATE POLICY player_profiles_update ON public.player_profiles FOR UPDATE TO authenticated
USING (public.can_edit_module(auth.uid(), 'plantel', team_id))
WITH CHECK (public.can_edit_module(auth.uid(), 'plantel', team_id));
CREATE POLICY player_profiles_delete ON public.player_profiles FOR DELETE TO authenticated
USING (public.can_edit_module(auth.uid(), 'plantel', team_id));

-- ============ ENTRENAMIENTOS ============
DROP POLICY IF EXISTS exercises_select ON public.exercises;
DROP POLICY IF EXISTS exercises_write ON public.exercises;

CREATE POLICY exercises_select ON public.exercises FOR SELECT TO authenticated
USING (
  CASE WHEN team_id IS NULL
    THEN public.has_club_access(auth.uid(), club_id)
         AND public.max_permission_any_team(auth.uid(), 'entrenamientos') <> 'sin_acceso'
    ELSE public.can_view_module(auth.uid(), 'entrenamientos', team_id)
  END
);
CREATE POLICY exercises_write ON public.exercises FOR ALL TO authenticated
USING (
  CASE WHEN team_id IS NULL
    THEN public.has_club_access(auth.uid(), club_id)
         AND public.max_permission_any_team(auth.uid(), 'entrenamientos') IN ('editor_categoria','editor_global')
    ELSE public.can_edit_module(auth.uid(), 'entrenamientos', team_id)
  END
)
WITH CHECK (
  public.has_club_access(auth.uid(), club_id) AND
  CASE WHEN team_id IS NULL
    THEN public.max_permission_any_team(auth.uid(), 'entrenamientos') IN ('editor_categoria','editor_global')
    ELSE public.can_edit_module(auth.uid(), 'entrenamientos', team_id)
  END
);

DROP POLICY IF EXISTS sessions_select ON public.training_sessions;
DROP POLICY IF EXISTS sessions_write ON public.training_sessions;

CREATE POLICY sessions_select ON public.training_sessions FOR SELECT TO authenticated
USING (public.can_view_module(auth.uid(), 'entrenamientos', team_id));
CREATE POLICY sessions_write ON public.training_sessions FOR ALL TO authenticated
USING (public.can_edit_module(auth.uid(), 'entrenamientos', team_id))
WITH CHECK (public.can_edit_module(auth.uid(), 'entrenamientos', team_id)
            AND public.has_club_access(auth.uid(), club_id));

DROP POLICY IF EXISTS session_exercises_select ON public.session_exercises;
DROP POLICY IF EXISTS session_exercises_write ON public.session_exercises;

CREATE POLICY session_exercises_select ON public.session_exercises FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.training_sessions s
               WHERE s.id = session_id
                 AND public.can_view_module(auth.uid(), 'entrenamientos', s.team_id)));
CREATE POLICY session_exercises_write ON public.session_exercises FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.training_sessions s
               WHERE s.id = session_id
                 AND public.can_edit_module(auth.uid(), 'entrenamientos', s.team_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.training_sessions s
               WHERE s.id = session_id
                 AND public.can_edit_module(auth.uid(), 'entrenamientos', s.team_id)));

-- ============ VIAJES ============
DROP POLICY IF EXISTS trips_select ON public.trips;
DROP POLICY IF EXISTS trips_insert ON public.trips;
DROP POLICY IF EXISTS trips_update ON public.trips;
DROP POLICY IF EXISTS trips_delete ON public.trips;

CREATE POLICY trips_select ON public.trips FOR SELECT TO authenticated
USING (public.can_view_module(auth.uid(), 'viajes', team_id)
       OR EXISTS (SELECT 1 FROM public.trip_travelers tt
                  WHERE tt.trip_id = trips.id AND tt.user_id = auth.uid()));
CREATE POLICY trips_insert ON public.trips FOR INSERT TO authenticated
WITH CHECK (public.has_club_access(auth.uid(), club_id)
            AND public.can_edit_module(auth.uid(), 'viajes', team_id));
CREATE POLICY trips_update ON public.trips FOR UPDATE TO authenticated
USING (public.can_edit_module(auth.uid(), 'viajes', team_id))
WITH CHECK (public.has_club_access(auth.uid(), club_id)
            AND public.can_edit_module(auth.uid(), 'viajes', team_id));
CREATE POLICY trips_delete ON public.trips FOR DELETE TO authenticated
USING (public.can_edit_module(auth.uid(), 'viajes', team_id));

-- trip_travelers
DROP POLICY IF EXISTS trip_travelers_select ON public.trip_travelers;
DROP POLICY IF EXISTS trip_travelers_insert ON public.trip_travelers;
DROP POLICY IF EXISTS trip_travelers_update ON public.trip_travelers;
DROP POLICY IF EXISTS trip_travelers_delete ON public.trip_travelers;

CREATE POLICY trip_travelers_select ON public.trip_travelers FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_view_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_travelers_insert ON public.trip_travelers FOR INSERT TO authenticated
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_travelers_update ON public.trip_travelers FOR UPDATE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id))
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_travelers_delete ON public.trip_travelers FOR DELETE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id));

-- trip_flights
DROP POLICY IF EXISTS trip_flights_select ON public.trip_flights;
DROP POLICY IF EXISTS trip_flights_insert ON public.trip_flights;
DROP POLICY IF EXISTS trip_flights_update ON public.trip_flights;
DROP POLICY IF EXISTS trip_flights_delete ON public.trip_flights;
CREATE POLICY trip_flights_select ON public.trip_flights FOR SELECT TO authenticated
USING (public.can_view_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_flights_insert ON public.trip_flights FOR INSERT TO authenticated
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_flights_update ON public.trip_flights FOR UPDATE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id))
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_flights_delete ON public.trip_flights FOR DELETE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id));

-- trip_hotels
DROP POLICY IF EXISTS trip_hotels_select ON public.trip_hotels;
DROP POLICY IF EXISTS trip_hotels_insert ON public.trip_hotels;
DROP POLICY IF EXISTS trip_hotels_update ON public.trip_hotels;
DROP POLICY IF EXISTS trip_hotels_delete ON public.trip_hotels;
CREATE POLICY trip_hotels_select ON public.trip_hotels FOR SELECT TO authenticated
USING (public.can_view_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_hotels_insert ON public.trip_hotels FOR INSERT TO authenticated
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_hotels_update ON public.trip_hotels FOR UPDATE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id))
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_hotels_delete ON public.trip_hotels FOR DELETE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id));

-- trip_transports
DROP POLICY IF EXISTS trip_transports_select ON public.trip_transports;
DROP POLICY IF EXISTS trip_transports_insert ON public.trip_transports;
DROP POLICY IF EXISTS trip_transports_update ON public.trip_transports;
DROP POLICY IF EXISTS trip_transports_delete ON public.trip_transports;
CREATE POLICY trip_transports_select ON public.trip_transports FOR SELECT TO authenticated
USING (public.can_view_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_transports_insert ON public.trip_transports FOR INSERT TO authenticated
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_transports_update ON public.trip_transports FOR UPDATE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id))
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_transports_delete ON public.trip_transports FOR DELETE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id));

-- trip_meals
DROP POLICY IF EXISTS trip_meals_select ON public.trip_meals;
DROP POLICY IF EXISTS trip_meals_insert ON public.trip_meals;
DROP POLICY IF EXISTS trip_meals_update ON public.trip_meals;
DROP POLICY IF EXISTS trip_meals_delete ON public.trip_meals;
CREATE POLICY trip_meals_select ON public.trip_meals FOR SELECT TO authenticated
USING (public.can_view_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_meals_insert ON public.trip_meals FOR INSERT TO authenticated
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_meals_update ON public.trip_meals FOR UPDATE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id))
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_meals_delete ON public.trip_meals FOR DELETE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id));

-- trip_luggage
DROP POLICY IF EXISTS trip_luggage_select ON public.trip_luggage;
DROP POLICY IF EXISTS trip_luggage_insert ON public.trip_luggage;
DROP POLICY IF EXISTS trip_luggage_update ON public.trip_luggage;
DROP POLICY IF EXISTS trip_luggage_delete ON public.trip_luggage;
CREATE POLICY trip_luggage_select ON public.trip_luggage FOR SELECT TO authenticated
USING (public.can_view_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_luggage_insert ON public.trip_luggage FOR INSERT TO authenticated
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_luggage_update ON public.trip_luggage FOR UPDATE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id))
WITH CHECK (public.can_edit_trip_new(auth.uid(), trip_id));
CREATE POLICY trip_luggage_delete ON public.trip_luggage FOR DELETE TO authenticated
USING (public.can_edit_trip_new(auth.uid(), trip_id));

-- trip_flight_passengers
DROP POLICY IF EXISTS tfp_select ON public.trip_flight_passengers;
DROP POLICY IF EXISTS tfp_insert ON public.trip_flight_passengers;
DROP POLICY IF EXISTS tfp_delete ON public.trip_flight_passengers;
CREATE POLICY tfp_select ON public.trip_flight_passengers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_view_trip_new(auth.uid(), f.trip_id)));
CREATE POLICY tfp_insert ON public.trip_flight_passengers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id))
        AND EXISTS (SELECT 1 FROM public.trip_flights f
               JOIN public.trip_travelers tt ON tt.trip_id = f.trip_id
               WHERE f.id = flight_id AND tt.user_id = trip_flight_passengers.user_id));
CREATE POLICY tfp_delete ON public.trip_flight_passengers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id)));

-- trip_flight_baggage_handlers
DROP POLICY IF EXISTS tfbh_select ON public.trip_flight_baggage_handlers;
DROP POLICY IF EXISTS tfbh_insert ON public.trip_flight_baggage_handlers;
DROP POLICY IF EXISTS tfbh_update ON public.trip_flight_baggage_handlers;
DROP POLICY IF EXISTS tfbh_delete ON public.trip_flight_baggage_handlers;
CREATE POLICY tfbh_select ON public.trip_flight_baggage_handlers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_view_trip_new(auth.uid(), f.trip_id)));
CREATE POLICY tfbh_insert ON public.trip_flight_baggage_handlers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id)));
CREATE POLICY tfbh_update ON public.trip_flight_baggage_handlers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id)));
CREATE POLICY tfbh_delete ON public.trip_flight_baggage_handlers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id)));

-- trip_boarding_passes (owner-only read + editors)
DROP POLICY IF EXISTS tbp_select ON public.trip_boarding_passes;
DROP POLICY IF EXISTS tbp_insert ON public.trip_boarding_passes;
DROP POLICY IF EXISTS tbp_update ON public.trip_boarding_passes;
DROP POLICY IF EXISTS tbp_delete ON public.trip_boarding_passes;
CREATE POLICY tbp_select ON public.trip_boarding_passes FOR SELECT TO authenticated
USING (user_id = auth.uid()
       OR EXISTS (SELECT 1 FROM public.trip_flights f
                  WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id)));
CREATE POLICY tbp_insert ON public.trip_boarding_passes FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id)));
CREATE POLICY tbp_update ON public.trip_boarding_passes FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id)));
CREATE POLICY tbp_delete ON public.trip_boarding_passes FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_flights f
               WHERE f.id = flight_id AND public.can_edit_trip_new(auth.uid(), f.trip_id)));

-- trip_rooms
DROP POLICY IF EXISTS trip_rooms_select ON public.trip_rooms;
DROP POLICY IF EXISTS trip_rooms_insert ON public.trip_rooms;
DROP POLICY IF EXISTS trip_rooms_update ON public.trip_rooms;
DROP POLICY IF EXISTS trip_rooms_delete ON public.trip_rooms;
CREATE POLICY trip_rooms_select ON public.trip_rooms FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_hotels h
               WHERE h.id = hotel_id AND public.can_view_trip_new(auth.uid(), h.trip_id)));
CREATE POLICY trip_rooms_insert ON public.trip_rooms FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_hotels h
               WHERE h.id = hotel_id AND public.can_edit_trip_new(auth.uid(), h.trip_id)));
CREATE POLICY trip_rooms_update ON public.trip_rooms FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_hotels h
               WHERE h.id = hotel_id AND public.can_edit_trip_new(auth.uid(), h.trip_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_hotels h
               WHERE h.id = hotel_id AND public.can_edit_trip_new(auth.uid(), h.trip_id)));
CREATE POLICY trip_rooms_delete ON public.trip_rooms FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_hotels h
               WHERE h.id = hotel_id AND public.can_edit_trip_new(auth.uid(), h.trip_id)));

-- trip_room_occupants
DROP POLICY IF EXISTS tro_select ON public.trip_room_occupants;
DROP POLICY IF EXISTS tro_insert ON public.trip_room_occupants;
DROP POLICY IF EXISTS tro_delete ON public.trip_room_occupants;
CREATE POLICY tro_select ON public.trip_room_occupants FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_rooms r JOIN public.trip_hotels h ON h.id = r.hotel_id
               WHERE r.id = room_id AND public.can_view_trip_new(auth.uid(), h.trip_id)));
CREATE POLICY tro_insert ON public.trip_room_occupants FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_rooms r JOIN public.trip_hotels h ON h.id = r.hotel_id
               WHERE r.id = room_id AND public.can_edit_trip_new(auth.uid(), h.trip_id))
        AND EXISTS (SELECT 1 FROM public.trip_rooms r JOIN public.trip_hotels h ON h.id = r.hotel_id
               JOIN public.trip_travelers tt ON tt.trip_id = h.trip_id
               WHERE r.id = room_id AND tt.user_id = trip_room_occupants.user_id));
CREATE POLICY tro_delete ON public.trip_room_occupants FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_rooms r JOIN public.trip_hotels h ON h.id = r.hotel_id
               WHERE r.id = room_id AND public.can_edit_trip_new(auth.uid(), h.trip_id)));

-- trip_transport_passengers
DROP POLICY IF EXISTS ttp_select ON public.trip_transport_passengers;
DROP POLICY IF EXISTS ttp_insert ON public.trip_transport_passengers;
DROP POLICY IF EXISTS ttp_delete ON public.trip_transport_passengers;
CREATE POLICY ttp_select ON public.trip_transport_passengers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_transports t
               WHERE t.id = transport_id AND public.can_view_trip_new(auth.uid(), t.trip_id)));
CREATE POLICY ttp_insert ON public.trip_transport_passengers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.trip_transports t
               WHERE t.id = transport_id AND public.can_edit_trip_new(auth.uid(), t.trip_id))
        AND EXISTS (SELECT 1 FROM public.trip_transports t
               JOIN public.trip_travelers tt ON tt.trip_id = t.trip_id
               WHERE t.id = transport_id AND tt.user_id = trip_transport_passengers.user_id));
CREATE POLICY ttp_delete ON public.trip_transport_passengers FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.trip_transports t
               WHERE t.id = transport_id AND public.can_edit_trip_new(auth.uid(), t.trip_id)));

-- ============ AGENDA ============
DROP POLICY IF EXISTS calendar_events_select ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_insert ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_update ON public.calendar_events;
DROP POLICY IF EXISTS calendar_events_delete ON public.calendar_events;

CREATE POLICY calendar_events_select ON public.calendar_events FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.event_attendees ea
          WHERE ea.event_id = calendar_events.id AND ea.user_id = auth.uid())
  OR CASE WHEN team_id IS NULL
       THEN public.has_club_access(auth.uid(), club_id)
            AND public.max_permission_any_team(auth.uid(), 'agenda') <> 'sin_acceso'
       ELSE public.can_view_module(auth.uid(), 'agenda', team_id)
     END
);
CREATE POLICY calendar_events_insert ON public.calendar_events FOR INSERT TO authenticated
WITH CHECK (
  public.has_club_access(auth.uid(), club_id) AND (
    CASE WHEN team_id IS NULL
      THEN public.max_permission_any_team(auth.uid(), 'agenda') IN ('editor_categoria','editor_global')
      ELSE public.can_edit_module(auth.uid(), 'agenda', team_id)
           OR (event_type = 'entrenamiento'::event_type
               AND public.can_edit_module(auth.uid(), 'entrenamientos', team_id))
    END
  )
);
CREATE POLICY calendar_events_update ON public.calendar_events FOR UPDATE TO authenticated
USING (
  CASE WHEN team_id IS NULL
    THEN public.has_club_access(auth.uid(), club_id)
         AND public.max_permission_any_team(auth.uid(), 'agenda') IN ('editor_categoria','editor_global')
    ELSE public.can_edit_module(auth.uid(), 'agenda', team_id)
         OR (event_type = 'entrenamiento'::event_type
             AND public.can_edit_module(auth.uid(), 'entrenamientos', team_id))
  END
)
WITH CHECK (
  public.has_club_access(auth.uid(), club_id) AND (
    CASE WHEN team_id IS NULL
      THEN public.max_permission_any_team(auth.uid(), 'agenda') IN ('editor_categoria','editor_global')
      ELSE public.can_edit_module(auth.uid(), 'agenda', team_id)
           OR (event_type = 'entrenamiento'::event_type
               AND public.can_edit_module(auth.uid(), 'entrenamientos', team_id))
    END
  )
);
CREATE POLICY calendar_events_delete ON public.calendar_events FOR DELETE TO authenticated
USING (
  CASE WHEN team_id IS NULL
    THEN public.has_club_access(auth.uid(), club_id)
         AND public.max_permission_any_team(auth.uid(), 'agenda') IN ('editor_categoria','editor_global')
    ELSE public.can_edit_module(auth.uid(), 'agenda', team_id)
         OR (event_type = 'entrenamiento'::event_type
             AND public.can_edit_module(auth.uid(), 'entrenamientos', team_id))
  END
);

DROP POLICY IF EXISTS event_attendees_select ON public.event_attendees;
DROP POLICY IF EXISTS event_attendees_insert ON public.event_attendees;
DROP POLICY IF EXISTS event_attendees_delete ON public.event_attendees;

CREATE POLICY event_attendees_select ON public.event_attendees FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.id = event_id)
);
CREATE POLICY event_attendees_insert ON public.event_attendees FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.calendar_events e
                    WHERE e.id = event_id
                      AND (public.can_edit_module(auth.uid(), 'agenda', e.team_id)
                           OR (e.event_type = 'entrenamiento'::event_type
                               AND public.can_edit_module(auth.uid(), 'entrenamientos', e.team_id)))));
CREATE POLICY event_attendees_delete ON public.event_attendees FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.calendar_events e
               WHERE e.id = event_id
                 AND (public.can_edit_module(auth.uid(), 'agenda', e.team_id)
                      OR (e.event_type = 'entrenamiento'::event_type
                          AND public.can_edit_module(auth.uid(), 'entrenamientos', e.team_id)))));