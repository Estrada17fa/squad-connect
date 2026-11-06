import { describe, it, expect } from "vitest";
import { parseAgenda, serializeAgenda, splitMeetings, confirmedSummary, groupByResponse, timeRange, mapsLinks } from "./juntas";

describe("orden del día", () => {
  it("lee texto viejo como un punto por línea", () => {
    expect(parseAgenda("- Presupuesto\nViaje a Tijuana\n\n")).toEqual([
      { text: "Presupuesto", done: false }, { text: "Viaje a Tijuana", done: false },
    ]);
  });
  it("conserva los puntos tratados al guardar y leer", () => {
    const items = [{ text: "A", done: true }, { text: "B", done: false }];
    expect(parseAgenda(serializeAgenda(items))).toEqual(items);
  });
  it("vacío se guarda como null", () => expect(serializeAgenda([{ text: " ", done: false }])).toBeNull());
});

describe("próximas y pasadas", () => {
  const now = new Date("2026-11-06T12:00:00");
  const mk = (starts: string, status: any = "programada", ends: string | null = null) => ({ starts_at: new Date(starts).toISOString(), ends_at: ends ? new Date(ends).toISOString() : null, status });
  it("una junta en curso es próxima aunque haya pasado su hora", () => {
    expect(splitMeetings([mk("2026-11-05T10:00", "en_curso")], now).upcoming).toHaveLength(1);
  });
  it("finalizada o cancelada va a pasadas", () => {
    const r = splitMeetings([mk("2026-11-07T10:00", "finalizada"), mk("2026-11-07T10:00", "cancelada")], now);
    expect(r.past).toHaveLength(2);
  });
  it("sin hora de fin dura una hora", () => {
    expect(splitMeetings([mk("2026-11-06T11:30")], now).upcoming).toHaveLength(1);
    expect(splitMeetings([mk("2026-11-06T10:30")], now).past).toHaveLength(1);
  });
});

describe("respuestas", () => {
  const a = [{ attendance_status: "confirmado" }, { attendance_status: "rechazado" }, { attendance_status: "invitado" }, { attendance_status: "confirmado" }];
  it("cuenta confirmados", () => expect(confirmedSummary(a).label).toBe("2 de 4 confirmaron"));
  it("agrupa por respuesta", () => {
    const g = groupByResponse(a);
    expect([g.yes.length, g.no.length, g.pending.length]).toEqual([2, 1, 1]);
  });
});

describe("horario", () => {
  it("mismo periodo", () => expect(timeRange(new Date("2026-11-06T10:00").toISOString(), new Date("2026-11-06T11:00").toISOString())).toBe("10:00 – 11:00 am"));
  it("cruza mediodía", () => expect(timeRange(new Date("2026-11-06T11:30").toISOString(), new Date("2026-11-06T13:00").toISOString())).toBe("11:30 am – 1:00 pm"));
});

describe("enlaces de mapa", () => {
  it("usa coordenadas", () => {
    const l = mapsLinks({ latitude: 23.2, longitude: -106.4, address: "X", name: "Y", place_id: "abc", source: "google" });
    expect(l.google).toBe("https://www.google.com/maps/search/?api=1&query=23.2,-106.4&query_place_id=abc");
    expect(l.waze).toBe("https://waze.com/ul?ll=23.2,-106.4&navigate=yes");
  });
  it("sin coordenadas usa la dirección", () => {
    const l = mapsLinks({ latitude: null, longitude: null, address: "Av. Del Mar 1", name: "Y" });
    expect(l.google).toContain("query=Av.%20Del%20Mar%201");
  });
});
