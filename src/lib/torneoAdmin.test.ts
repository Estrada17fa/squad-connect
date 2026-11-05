import { describe, it, expect } from "vitest";
import { displayStatus, parsePastedTeams } from "./torneoAdmin";

describe("estado mostrado del torneo", () => {
  it("en curso sin partidos jugados se muestra como Próximo", () => {
    expect(displayStatus("en_curso", 0)).toBe("proximo");
  });
  it("en curso con un partido jugado se muestra En curso", () => {
    expect(displayStatus("en_curso", 1)).toBe("en_curso");
  });
  it("finalizado siempre es Finalizado", () => {
    expect(displayStatus("finalizado", 0)).toBe("finalizado");
  });
});

describe("pegar lista", () => {
  it("un nombre por línea, sin vacíos ni repetidos", () => {
    expect(parsePastedTeams("Tigres\n\n1. Pumas\ntigres\n- Atlas ")).toEqual(["Tigres", "Pumas", "Atlas"]);
  });
});
