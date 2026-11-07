import { describe, expect, it } from "vitest";
import { computeReadiness, departureLabel, isPlayerVisible, splitPlayerTrips, splitTrips, travelerGroup, tripDisplayStatus, tripLinkFor } from "./viajes";

const t = (id: string) => ({ user_id: id });

describe("computeReadiness", () => {
  const flights = [
    { id: "f1", leg: "ida" as const, passengers: [t("a"), t("b"), t("c")], boarding_passes: [{ user_id: "a" }] },
    { id: "f2", leg: "regreso" as const, passengers: [t("a"), t("b"), t("c")], boarding_passes: [{ user_id: "a" }, { user_id: "b" }, { user_id: "c" }] },
  ];
  const hotels = [{ rooms: [{ occupants: [t("a")] }, { occupants: [] }] }];
  const transports = [{ leg: "regreso" as const, passengers: [t("a"), t("b")] }];

  it("cuenta quién no tiene pase, cuarto o transporte de regreso", () => {
    const r = computeReadiness([t("a"), t("b"), t("c")], flights, hotels, transports);
    expect(r.gaps.map((g) => g.label)).toEqual(["2 sin pase de abordar", "2 sin cuarto", "1 sin transporte de regreso"]);
    expect(r.ready).toBe(false);
    expect(r.byTraveler.a).toEqual({ flight: true, pass: true, room: true, transport: true });
    expect(r.byTraveler.c).toEqual({ flight: true, pass: false, room: false, transport: false });
  });

  it("queda Todo listo cuando todos tienen todo", () => {
    const full = flights.map((f) => ({ ...f, boarding_passes: [t("a"), t("b")] }));
    const r = computeReadiness([t("a"), t("b")], full, [{ rooms: [{ occupants: [t("a"), t("b")] }] }], transports);
    expect(r.percent).toBe(100);
    expect(r.ready).toBe(true);
    expect(r.gaps).toEqual([]);
  });

  it("sin logística registrada no está listo (0%)", () => {
    const r = computeReadiness([t("a")], [], [], []);
    expect(r.percent).toBe(0);
    expect(r.ready).toBe(false);
  });
});

describe("tripLinkFor", () => {
  it("quien gestiona viajes va a la ficha de Coordinación", () => {
    expect(tripLinkFor(true, "x")).toEqual({ kind: "coord", to: "/coordinacion/general/viajes/$tripId", tripId: "x" });
  });
  it("el jugador va a Agenda › Viajes con su viaje", () => {
    expect(tripLinkFor(false, "x")).toEqual({ kind: "agenda", to: "/agenda-viajes", open: "x" });
  });
});

describe("departureLabel / splitTrips", () => {
  const now = new Date(2026, 10, 6, 13, 0);
  it("dice 'Sale mañana' para el día siguiente", () => {
    expect(departureLabel(new Date(2026, 10, 7, 5, 15).toISOString(), null, now)).toBe("Sale mañana");
    expect(departureLabel(new Date(2026, 10, 9).toISOString(), null, now)).toBe("Sale en 3 días");
  });
});

describe("estados de viaje", () => {
  const now = new Date(2026, 10, 6, 23, 30);
  const d = (day: number) => new Date(2026, 10, day, 12).toISOString();
  it("la fecha nunca saca a un viaje Publicado de Próximos del jugador", () => {
    const s = splitPlayerTrips([{ status: "confirmado" as const, departure_at: d(1), return_at: d(3) }]);
    expect(s.upcoming).toHaveLength(1);
  });
  it("el jugador nunca ve Borradores", () => {
    const s = splitPlayerTrips([{ status: "planeacion" as const, departure_at: d(7) }]);
    expect(s.upcoming).toHaveLength(0);
    expect(s.past).toHaveLength(0);
    expect(isPlayerVisible({ status: "planeacion" })).toBe(false);
  });
  it("Finalizado pasa a Viajes anteriores", () => {
    const s = splitPlayerTrips([{ status: "completado" as const, departure_at: d(1) }]);
    expect(s.past).toHaveLength(1);
  });
  it("Coordinación: Borrador sigue en Próximos y solo Finalizado sale", () => {
    const s = splitTrips([{ status: "planeacion" as const, departure_at: d(1) }, { status: "completado" as const, departure_at: d(2) }]);
    expect(s.upcoming).toHaveLength(1);
    expect(s.past).toHaveLength(1);
  });
  it("Publicado con regreso hoy se muestra En curso todo el día", () => {
    expect(tripDisplayStatus({ status: "confirmado", departure_at: d(4), return_at: d(6) }, now)).toBe("en_curso");
    expect(tripDisplayStatus({ status: "confirmado", departure_at: d(9), return_at: d(10) }, now)).toBe("publicado");
    expect(tripDisplayStatus({ status: "planeacion", departure_at: d(4), return_at: d(6) }, now)).toBe("borrador");
  });
  it("rol Jugador va a Jugadores y todo lo demás a Staff", () => {
    expect(travelerGroup("Jugador")).toBe("jugadores");
    expect(travelerGroup("Staff")).toBe("staff");
    expect(travelerGroup(null)).toBe("staff");
  });
});

import { detectFlight, extractFromPageText, matchPerson } from "./boardingPassMatch";

describe("detectFlight", () => {
  const flights = [
    { id: "ida", flight_code: "AM 1234", departs_at: new Date(2026, 9, 23, 7).toISOString() },
    { id: "reg", flight_code: "AM 1235", departs_at: new Date(2026, 9, 25, 18).toISOString() },
  ];
  it("reconoce el vuelo por su código aunque venga con ceros", () => {
    expect(detectFlight(extractFromPageText("Flight: AM01235\nLOPEZ PAYAN/LUIS FERNANDO", 1), flights)?.id).toBe("reg");
  });
  it("si no hay código, usa la fecha del vuelo", () => {
    expect(detectFlight({ text: "SJD MEX 23OCT seat 12A", flightCode: null }, flights)?.id).toBe("ida");
  });
  it("sugiere a la persona aunque el nombre venga APELLIDO/NOMBRE", () => {
    const ex = extractFromPageText("BOARDING PASS\nLOPEZ PAYAN/LUIS FERNANDO\nSeat 12A", 1);
    const m = matchPerson(ex.nameGuess, [{ user_id: "u1", label: "Luis Fernando López Payán" }, { user_id: "u2", label: "Carlos Ruiz" }]);
    expect(m.userId).toBe("u1");
  });
});

import { isAgendaVisible as _iav } from "./viajes";
describe("isAgendaVisible", () => {
  it("oculta viajes en Borrador", () => expect(_iav({ trip_id: "t", trip: { status: "planeacion" } })).toBe(false));
  it("muestra viajes Publicados y Finalizados", () => {
    expect(_iav({ trip_id: "t", trip: { status: "confirmado" } })).toBe(true);
    expect(_iav({ trip_id: "t", trip: { status: "completado" } })).toBe(true);
  });
  it("oculta si no puede ver el viaje", () => expect(_iav({ trip_id: "t", trip: null })).toBe(false));
  it("eventos sin viaje pasan", () => expect(_iav({ trip_id: null })).toBe(true));
});
