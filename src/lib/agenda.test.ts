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
