import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { extractFromPageText, guessName, matchPerson } from "./boardingPassMatch";

const VOLARIS = "¡Tu pase de abordar está listo!\n\nPase de abordar\n \n(1/1)\n\nFecha\n\n7 de nov, 2026\n\nReserva\n\nMHLRPT\n\nLuis Carlos Parra Galvez\n\nSEC.\n \n165\n\nSJD\n\nLos Cabos\nTerminal 1\n\n03:15 p.m.\n\nPBC\n\nPuebla\nTerminal 1\n\nVuelo 645\n\nGrupo\n\n6\n\nAsiento\n\n29A\n\nTarifa Zero";

const PEOPLE = ["Abraham Ortega Jattar","Ángel Yahir Jiménez Herrera","Antonio López Zambada","César Gabriel Hernández García","Edgar Ocampo Beltrán","Edson Antonio Alvarado García","Eduardo Chacón Guzmán","Emmanuel Quezada Contreras","Fermin Celis Becerra","Jacobo Rosas Hernández","Jesús Alfredo Torres Serna","Jesús Martín Nieto Guerrero","Juan Carlos Sandoval Martínez","Luis Carlos Parra Galvez","Luis Fernando López Payán","Luis Gustavo Martínez Armas","Manuel Alejandro Calvillo Morales","Manuel Gil Segovia Lorenzana","Noé Fernando Godoy Mendoza","Omar Alain Corona Rayas","Raul Daniel López González","Renato Sebastián González González","Rodrigo Acosta Sánchez","Sergio Iván Gurrero Rodríguez"].map((label, i) => ({ user_id: String(i), label }));

describe("lectura de pases", () => {
  it("Volaris: nombre tras la clave de reserva, asiento, grupo y terminal", () => {
    const e = extractFromPageText(VOLARIS, 1);
    expect(e.nameGuess).toBe("Luis Carlos Parra Galvez");
    expect(e.seat).toBe("29A");
    expect(e.group).toBe("6");
    expect(e.terminal).toBe("1");
  });
  it("texto real del PDF de Volaris (si está disponible)", () => {
    const f = "/tmp/pp/page.json";
    if (!existsSync(f)) return;
    const e = extractFromPageText(JSON.parse(readFileSync(f, "utf8")), 1);
    expect(e.nameGuess).toBe("Luis Carlos Parra Galvez");
  });
  it("Volaris con los 24 pasajeros del vuelo: todos con sugerencia correcta", () => {
    let ok = 0;
    for (const p of PEOPLE) {
      const e = extractFromPageText(VOLARIS.replace("Luis Carlos Parra Galvez", p.label), 1);
      if (matchPerson(e.nameGuess, PEOPLE).userId === p.user_id) ok++;
    }
    expect(ok).toBeGreaterThanOrEqual(20);
  });
  it("APELLIDO/NOMBRE (Aeroméxico / Viva)", () => {
    expect(guessName("BOARDING PASS\nPARRA GALVEZ/LUIS CARLOS MR\nAM 123")).toBe("LUIS CARLOS PARRA GALVEZ");
  });
  it("etiqueta en otra línea", () => {
    expect(guessName("Pasajero\nLuis Carlos Parra\nAsiento 3A")).toBe("Luis Carlos Parra");
    expect(guessName("Passenger: Ana Ruiz")).toBe("Ana Ruiz");
  });
  it("página sin texto: sin nombre", () => {
    expect(extractFromPageText("", 1).nameGuess).toBeNull();
  });
});
