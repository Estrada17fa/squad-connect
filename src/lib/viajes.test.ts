import { describe, expect, it } from "vitest";
import { computeReadiness, departureLabel, splitTrips, tripLinkFor } from "./viajes";

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
  it("un viaje que regresa hoy sigue en Próximos", () => {
    const s = splitTrips([{ departure_at: new Date(2026, 10, 4).toISOString(), return_at: new Date(2026, 10, 6).toISOString() }], now);
    expect(s.upcoming).toHaveLength(1);
  });
});
