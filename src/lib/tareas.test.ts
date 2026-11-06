import { describe, it, expect } from "vitest";
import { whenGroup, isRecentDone, myTasksSummary, canCompleteTask } from "./tareas";

// Miércoles 11 nov 2026, 10:00 hora local.
const now = new Date(2026, 10, 11, 10, 0);
const at = (d: number, h = 18) => new Date(2026, 10, d, h, 0).toISOString();
const me = [{ id: "u1" }];

describe("grupos por cuándo", () => {
  it("vencida si la fecha ya pasó", () => expect(whenGroup({ status: "pendiente", due_at: at(11, 8) }, now)).toBe("vencidas"));
  it("hoy si vence más tarde hoy", () => expect(whenGroup({ status: "pendiente", due_at: at(11, 18) }, now)).toBe("hoy"));
  it("esta semana hasta el domingo", () => expect(whenGroup({ status: "pendiente", due_at: at(15, 20) }, now)).toBe("semana"));
  it("después a partir del lunes siguiente", () => expect(whenGroup({ status: "pendiente", due_at: at(16, 9) }, now)).toBe("despues"));
  it("sin fecha", () => expect(whenGroup({ status: "en_pausa", due_at: null }, now)).toBe("sin_fecha"));
  it("hechas aunque esté vencida", () => expect(whenGroup({ status: "completada", due_at: at(1) }, now)).toBe("hechas"));
});

describe("hechas recientes: últimas 2 semanas", () => {
  it("13 días atrás sí", () => expect(isRecentDone({ status: "completada", due_at: null, completed_at: new Date(2026, 9, 29, 10).toISOString() }, now)).toBe(true));
  it("15 días atrás no", () => expect(isRecentDone({ status: "completada", due_at: null, completed_at: new Date(2026, 9, 27, 10).toISOString() }, now)).toBe(false));
});

describe("resumen de mis tareas", () => {
  it("rojo con vencidas", () => {
    const s = myTasksSummary([{ status: "pendiente", due_at: at(10), assignees: me }, { status: "pendiente", due_at: at(11), assignees: me }], "u1", now);
    expect(s).toMatchObject({ count: 2, overdue: 1, urgency: "red", context: "1 vencida" });
  });
  it("ámbar con 'N vencen hoy'", () => {
    const s = myTasksSummary([{ status: "pendiente", due_at: at(11), assignees: me }, { status: "en_progreso", due_at: at(11, 20), assignees: me }], "u1", now);
    expect(s).toMatchObject({ count: 2, urgency: "amber", context: "2 vencen hoy" });
  });
  it("no cuenta hechas ni de otros", () => {
    const s = myTasksSummary([{ status: "completada", due_at: at(10), assignees: me }, { status: "pendiente", due_at: at(10), assignees: [{ id: "u2" }] }], "u1", now);
    expect(s.count).toBe(0);
  });
});

describe("evidencia", () => {
  it("bloquea completar sin foto si la pide", () => expect(canCompleteTask(true, 0)).toBe(false));
  it("permite con foto", () => expect(canCompleteTask(true, 1)).toBe(true));
  it("permite si no la pide", () => expect(canCompleteTask(false, 0)).toBe(true));
});
