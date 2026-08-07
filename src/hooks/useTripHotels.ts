import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripChannel, syncAssignments } from "./useTripChannel";
import { MINI_PROFILE_SELECT, type MiniProfile } from "@/lib/tripLogistics";

export interface TripRoom {
  id: string;
  hotel_id: string;
  room_label: string;
  notes: string | null;
  occupants: { id: string; user_id: string; profile: MiniProfile | null }[];
}

export interface TripHotel {
  id: string;
  trip_id: string;
  name: string;
  address: string | null;
  check_in_at: string;
  check_out_at: string | null;
  phone: string | null;
  notes: string | null;
  rooms: TripRoom[];
}

export interface HotelInput {
  name: string;
  address: string | null;
  location_id?: string | null;
  check_in_at: string;
  check_out_at: string | null;
  phone: string | null;
  notes: string | null;
}

export interface RoomInput {
  room_label: string;
  notes: string | null;
}

const SELECT =
  `id, trip_id, name, address, check_in_at, check_out_at, phone, notes, ` +
  `rooms:trip_rooms(id, hotel_id, room_label, notes, occupants:trip_room_occupants(id, user_id, profile:profiles(${MINI_PROFILE_SELECT})))`;

export const tripHotelsKey = (tripId: string | null | undefined) => ["trip-hotels", tripId ?? "none"] as const;

export function useTripHotels(tripId: string | null | undefined) {
  const query = useQuery({
    queryKey: tripHotelsKey(tripId),
    enabled: !!tripId,
    queryFn: async (): Promise<TripHotel[]> => {
      const { data, error } = await supabase
        .from("trip_hotels")
        .select(SELECT)
        .eq("trip_id", tripId!)
        .order("check_in_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as TripHotel[];
      return rows.map((h) => ({
        ...h,
        rooms: [...(h.rooms ?? [])].sort((a, b) => a.room_label.localeCompare(b.room_label, "es", { numeric: true })),
      }));
    },
  });

  useTripChannel("trip-hotels", tripId, ["trip_hotels", "trip_rooms", "trip_room_occupants"], tripHotelsKey(tripId));

  return query;
}

export function useHotelMutations(tripId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: tripHotelsKey(tripId) });

  const saveHotel = useMutation({
    mutationFn: async ({ id, input, userId }: { id?: string; input: HotelInput; userId: string }) => {
      if (id) {
        const { error } = await supabase.from("trip_hotels").update(input).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("trip_hotels")
        .insert({ ...input, trip_id: tripId!, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidate,
  });

  const removeHotel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_hotels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const saveRoom = useMutation({
    mutationFn: async ({ id, hotelId, input }: { id?: string; hotelId: string; input: RoomInput }) => {
      if (id) {
        const { error } = await supabase.from("trip_rooms").update(input).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("trip_rooms")
        .insert({ ...input, hotel_id: hotelId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidate,
  });

  const removeRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setOccupants = useMutation({
    mutationFn: async ({ roomId, current, next }: { roomId: string; current: string[]; next: string[] }) =>
      syncAssignments("trip_room_occupants", "room_id", roomId, current, next),
    onSuccess: invalidate,
  });

  return { saveHotel, removeHotel, saveRoom, removeRoom, setOccupants, invalidate };
}
