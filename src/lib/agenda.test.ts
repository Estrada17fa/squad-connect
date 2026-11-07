import { describe, expect, it } from "vitest";
import { filterAgenda, groupByDay, pickHero, agendaKind } from "./agenda";

const now = new Date(2026, 10, 6, 12, 0);
const at = (d: number, h = 10) => new Date(2026, 10, d, h).toISOString();
const ev = (id: string, type: string, team: string | null, d: number, extra = {}) => ({ id, event_type: type, team_id: team, starts_at: at(d), ...extra });

describe("filterAgenda", () => {
  const evs = [ev("a", "partido", "pri", 7), ev("b", "partido", "juv", 7), ev("c", "junta", null, 8)];
  it("solo categorías de la persona más Todo el club", () =>
    expect(filterAgenda(evs, ["pri"], null, []).map((e) => e.id)).toEqual(["a", "c"]));
  it("una categoría elegida", () => expect(filterAgenda(evs, ["pri", "juv"], "juv", []).map((e) => e.id)).toEqual(["b", "c"]));
  it("varios tipos a la vez", () => expect(filterAgenda(evs, ["pri", "juv"], null, ["junta"]).map((e) => e.id)).toEqual(["c"]));
});

describe("pickHero", () => {
  it("partido en 7 días gana", () =>
    expect(pickHero([ev("j", "junta", null, 7), ev("p", "partido", "pri", 12)], new Set(), now)?.id).toBe("p"));
  it("sin partido cercano: viaje donde viaja", () =>
    expect(pickHero([ev("j", "junta", null, 7), ev("v", "viaje", "pri", 9, { trip_id: "t" }), ev("p", "partido", "pri", 20)], new Set(["v"]), now)?.id).toBe("v"));
  it("si no, el próximo evento", () =>
    expect(pickHero([ev("j", "junta", null, 7), ev("v", "viaje", "pri", 9, { trip_id: "t" })], new Set(), now)?.id).toBe("j"));
});

describe("groupByDay", () => {
  it("solo 14 días", () => expect(groupByDay([ev("a", "junta", null, 7), ev("b", "junta", null, 25)], 14, now).length).toBe(1));
  it("evento ligado a viaje es tipo viaje", () => expect(agendaKind({ event_type: "evento_especial", trip_id: "t" })).toBe("viaje"));
});

import { weekStart, weekDays, dayDots, tripMoments } from "./agenda";

describe("tira de la semana", () => {
  it("la semana empieza en lunes y tiene 7 días", () => {
    const s = weekStart(new Date(2026, 10, 7)); // sábado 7 nov
    expect(s.getDate()).toBe(2);
    expect(weekDays(s).map((d) => d.getDate())).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });
  it("máximo 3 puntos y el partido va primero", () => {
    const at = new Date(2026, 10, 7, 10).toISOString();
    const evs = ["junta", "entrenamiento", "partido", "otro"].map((t) => ({ event_type: t, starts_at: at }));
    expect(dayDots(evs, new Date(2026, 10, 7))).toEqual(["partido", "otro", "otro"]);
  });
});

describe("momentos del viaje", () => {
  const trip = { id: "t", departure_at: "2026-11-08T12:00:00Z", return_at: "2026-11-10T12:00:00Z" };
  it("sin vuelos: salida y regreso del viaje", () => {
    expect(tripMoments(trip, []).map((m) => m.at)).toEqual([trip.departure_at, trip.return_at]);
  });
  it("con vuelos: usa el primer vuelo de cada tramo", () => {
    const f = (id: string, leg: "ida" | "regreso", at: string) => ({ id, leg, origin: "SJD", destination: "MEX", departs_at: at, arrives_at: null, flight_code: "AM1" });
    const m = tripMoments(trip, [f("b", "ida", "2026-11-08T15:00:00Z"), f("a", "ida", "2026-11-08T09:00:00Z"), f("c", "regreso", "2026-11-10T18:00:00Z")]);
    expect(m.map((x) => x.flight?.id)).toEqual(["a", "c"]);
  });
  it("sin regreso: solo la salida", () => {
    expect(tripMoments({ ...trip, return_at: null }, [])).toHaveLength(1);
  });
});

import { weekRange, weekLabel, monthGridDays, groupByMonthDay, parseDayKey } from "./agenda";
describe("vistas de agenda", () => {
  it("semana de lunes a lunes", () => {
    const { from, to } = weekRange(new Date(2026, 10, 8));
    expect([from.getDate(), to.getDate()]).toEqual([2, 9]);
  });
  it("rango de semana", () => {
    expect(weekLabel(new Date(2026, 10, 2))).toBe("2 – 8 nov 2026");
    expect(weekLabel(new Date(2026, 10, 30))).toBe("30 nov – 6 dic 2026");
  });
  it("cuadrícula de noviembre 2026 incluye días vecinos", () => {
    const g = monthGridDays(new Date(2026, 10, 15));
    expect(g.from.getDate()).toBe(26);
    expect(g.days.length % 7).toBe(0);
    expect(g.days[g.days.length - 1].getDate()).toBe(6);
  });
  it("agrupa por mes y día", () => {
    const g = groupByMonthDay([{ starts_at: new Date(2026, 11, 1, 10).toISOString() }, { starts_at: new Date(2026, 10, 8, 10).toISOString() }, { starts_at: new Date(2026, 10, 8, 12).toISOString() }]);
    expect(g.map((m) => m.days.map((d) => d.events.length))).toEqual([[2], [1]]);
  });
  it("fecha inválida", () => { expect(parseDayKey("2026-02-31")).toBeNull(); expect(parseDayKey("x")).toBeNull(); });
});
