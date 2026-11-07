import { describe, it, expect } from "vitest";
import { formationSlots, positionCounts, callupDiff, noticeCount, canBuildLineup, substitutes, assignSlot, cleanLineup, canCopyLineup, lineupLabel, callupStatus, FORMATIONS } from "./partidos";

describe("partidos", () => {
  it("cada formación tiene 11 puestos", () => {
    for (const f of FORMATIONS) expect(formationSlots(f)).toHaveLength(11);
  });
  it("conteo por posición", () => {
    expect(positionCounts(["Portero", "Portero", "Defensa", "Delantero", null])).toBe("2 POR · 1 DEF · 1 DEL");
  });
  it("aviso solo a quien entra o sale después de publicar", () => {
    expect(callupDiff(["a", "b"], ["b", "c"])).toEqual({ added: ["c"], removed: ["a"] });
    expect(noticeCount(true, ["a", "b"], ["b", "c"])).toBe(2);
    expect(noticeCount(false, ["a", "b"], ["b", "c"])).toBe(0);
  });
  it("alineación disponible desde 11 convocados", () => {
    expect(canBuildLineup(10)).toBe(false);
    expect(canBuildLineup(11)).toBe(true);
  });
  it("suplentes = convocados sin puesto", () => {
    expect(substitutes(["a", "b", "c"], { POR: "a" })).toEqual(["b", "c"]);
  });
  it("asignar a un puesto ocupado intercambia", () => {
    expect(assignSlot({ POR: "a", LI: "b" }, "POR", "b")).toEqual({ POR: "b", LI: "a" });
  });
  it("limpia a los que ya no están convocados", () => {
    expect(cleanLineup({ POR: "a", LI: "x" }, ["a"], "4-4-2")).toEqual({ POR: "a" });
  });
  it("copiar alineación solo si coinciden los convocados", () => {
    expect(canCopyLineup({ POR: "a" }, ["a", "b"])).toBe(true);
    expect(canCopyLineup({ POR: "z" }, ["a"])).toBe(false);
  });
  it("etiqueta del jugador", () => {
    expect(lineupLabel("titular", "LI", "4-4-2")).toBe("Titular · DEF");
    expect(lineupLabel("suplente", null)).toBe("Suplente");
    expect(lineupLabel(null, null)).toBeNull();
  });
  it("estado de convocatoria", () => {
    expect(callupStatus(0, null)).toBe("Sin convocatoria");
    expect(callupStatus(18, null)).toBe("Borrador");
    expect(callupStatus(20, "2026-11-06")).toBe("Publicada");
  });
});
