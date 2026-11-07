import { describe, expect, it } from "vitest";
import { defaultLeg, myItinerary, nextItemId, orderPassCards, sessionNoticeTargets, similarPeople, tripDayLabel, personDeparture, personReturn } from "./misViajes";

describe("defaultLeg", () => {
  const f = [{ leg: "ida", departs_at: "2026-11-07T10:00:00Z", arrives_at: "2026-11-07T12:00:00Z" }, { leg: "regreso", departs_at: "2026-11-09T10:00:00Z" }];
  it("Ida antes de que pase la ida", () => expect(defaultLeg(f, new Date("2026-11-07T08:00:00Z"))).toBe("ida"));
  it("Regreso cuando ya pasó la ida", () => expect(defaultLeg(f, new Date("2026-11-08T08:00:00Z"))).toBe("regreso"));
  it("Solo regreso", () => expect(defaultLeg([f[1]!], new Date("2026-11-01"))).toBe("regreso"));
});

describe("tripDayLabel (solo el día, nunca la hora)", () => {
  const now = new Date(2026, 10, 6, 12, 0);
  const iso = (d: number, h = 12, m = 0) => new Date(2026, 10, d, h, m).toISOString();
  it("Sale mañana sin hora aunque haya reunión 9:30", () => expect(tripDayLabel({ status: "confirmado", departure_at: iso(7), return_at: null, meeting_at: iso(7, 9, 30) }, {}, now)).toBe("Sale mañana"));
  it("Sale mañana sin reunión ni vuelos", () => expect(tripDayLabel({ status: "confirmado", departure_at: iso(7), return_at: null }, {}, now)).toBe("Sale mañana"));
  it("Sale el sáb 7 cuando faltan días", () => expect(tripDayLabel({ status: "confirmado", departure_at: iso(7), return_at: null }, {}, new Date(2026, 10, 4))).toBe("Sale el sáb 7"));
  it("Regresa el lun 9", () => expect(tripDayLabel({ status: "en_curso", departure_at: iso(5), return_at: iso(9) }, {}, now)).toBe("Regresa el lun 9"));
  it("En curso sin regreso", () => expect(tripDayLabel({ status: "en_curso", departure_at: iso(5), return_at: null }, {}, now)).toBe("En curso"));
  it("Regresa hoy", () => expect(tripDayLabel({ status: "confirmado", departure_at: iso(5), return_at: iso(6, 20) }, {}, now)).toBe("Regresa hoy"));
  it("Finalizado", () => expect(tripDayLabel({ status: "completado", departure_at: iso(1), return_at: iso(2) }, {}, now)).toBe("Finalizado"));
});

describe("personDeparture / personReturn", () => {
  const trip = { departure_at: new Date(2026, 10, 8).toISOString(), return_at: new Date(2026, 10, 10).toISOString(), meeting_at: null };
  const flights = [
    { leg: "ida", departs_at: new Date(2026, 10, 7, 6).toISOString(), passengers: [{ user_id: "u1" }] },
    { leg: "ida", departs_at: new Date(2026, 10, 6, 6).toISOString(), passengers: [{ user_id: "u2" }] },
    { leg: "regreso", departs_at: new Date(2026, 10, 11, 6).toISOString(), passengers: [{ user_id: "u1" }] },
  ];
  it("usa el primer vuelo de esa persona", () => expect(personDeparture(trip, { userId: "u1", flights }).getDate()).toBe(7));
  it("usa su último regreso", () => expect(personReturn(trip, { userId: "u1", flights })?.getDate()).toBe(11));
  it("sin vuelos usa el viaje", () => expect(personDeparture(trip).getDate()).toBe(8));
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
