import { describe, expect, it } from "vitest";
import { defaultLeg, myItinerary, nextItemId, orderPassCards, sessionNoticeTargets, similarPeople, tripTimeLabel } from "./misViajes";

describe("defaultLeg", () => {
  const f = [{ leg: "ida", departs_at: "2026-11-07T10:00:00Z", arrives_at: "2026-11-07T12:00:00Z" }, { leg: "regreso", departs_at: "2026-11-09T10:00:00Z" }];
  it("Ida antes de que pase la ida", () => expect(defaultLeg(f, new Date("2026-11-07T08:00:00Z"))).toBe("ida"));
  it("Regreso cuando ya pasó la ida", () => expect(defaultLeg(f, new Date("2026-11-08T08:00:00Z"))).toBe("regreso"));
  it("Solo regreso", () => expect(defaultLeg([f[1]!], new Date("2026-11-01"))).toBe("regreso"));
});

describe("tripTimeLabel", () => {
  const t = (iso: string) => iso.slice(11, 16);
  const now = new Date(2026, 10, 6, 12, 0);
  it("Sale mañana", () => expect(tripTimeLabel({ status: "confirmado", departure_at: new Date(2026, 10, 7, 5, 15).toISOString(), return_at: null }, now, () => "5:15 am")).toBe("Sale mañana 5:15 am"));
  it("En curso", () => expect(tripTimeLabel({ status: "confirmado", departure_at: new Date(2026, 10, 5).toISOString(), return_at: new Date(2026, 10, 8).toISOString() }, now, t)).toBe("En curso"));
  it("Regresa hoy", () => expect(tripTimeLabel({ status: "confirmado", departure_at: new Date(2026, 10, 5).toISOString(), return_at: new Date(2026, 10, 6, 20).toISOString() }, now, t)).toBe("Regresa hoy"));
});

describe("myItinerary", () => {
  const items = myItinerary({
    userId: "u1",
    trip: { meeting_at: "2026-11-07T04:00:00Z", meeting_point: "Estadio", match_event: null },
    flights: [
      { id: "a", flight_code: "AM1", airline: null, origin: "SJD", destination: "MEX", departs_at: "2026-11-07T06:00:00Z", passengers: [{ user_id: "u1" }] },
      { id: "b", flight_code: "AM2", airline: null, origin: "SJD", destination: "MEX", departs_at: "2026-11-07T07:00:00Z", passengers: [{ user_id: "u2" }] },
    ],
    transports: [{ id: "t", label: "Autobús", transport_type: "bus", pickup_location: "MEX", destination: "Hotel", departs_at: "2026-11-07T09:00:00Z", passengers: [{ user_id: "u2" }] }],
    hotels: [{ id: "h", name: "Hotel", address: null, check_in_at: "2026-11-07T10:00:00Z", check_out_at: null, rooms: [{ occupants: [{ user_id: "u1" }] }] }],
    meals: [],
  });
  it("solo lo de la persona, en orden", () => expect(items.map((i) => i.id)).toEqual(["cita", "f-a", "hi-h"]));
  it("siguiente por suceder", () => expect(nextItemId(items, new Date("2026-11-07T05:00:00Z"))).toBe("f-a"));
});

describe("tarjetas de pases", () => {
  it("ordena seguras, revisar y sin coincidencia", () => {
    const c = [
      { k: 1, confidence: "ninguna" as const, suggestedUserId: null },
      { k: 2, confidence: "media" as const, suggestedUserId: "x" },
      { k: 3, confidence: "alta" as const, suggestedUserId: "y" },
    ];
    expect(orderPassCards(c).map((x) => x.k)).toEqual([3, 2, 1]);
  });
  it("quien ya tiene pase no aparece como opción", () => {
    const p = [{ user_id: "a", label: "Ana Ruiz" }, { user_id: "b", label: "Ana Rosas" }];
    expect(similarPeople("ANA RUIZ", p, new Set(["a"])).map((x) => x.user_id)).toEqual(["b"]);
  });
  it("un aviso por persona aunque reciba 3 pases; deshacer lo quita", () => {
    expect(sessionNoticeTargets([{ userId: "a" }, { userId: "a" }, { userId: "a" }])).toEqual(["a"]);
    expect(sessionNoticeTargets([{ userId: "a", undone: true }, { userId: "b" }])).toEqual(["b"]);
  });
});
