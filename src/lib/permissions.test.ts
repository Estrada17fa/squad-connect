import { describe, expect, it } from "vitest";
import { coerceLevelFor, levelOptionsFor } from "./permissions";
import { resolvePagesForUser } from "./rolePages";

describe("escala simplificada de permisos", () => {
  it("Coordinación ofrece Sin acceso / Ver / Editor", () => {
    expect(levelOptionsFor("viajes").map((o) => o.label)).toEqual(["Sin acceso", "Ver", "Editor"]);
  });
  it("Usuarios solo ofrece Sin acceso / Con acceso", () => {
    expect(levelOptionsFor("usuarios").map((o) => o.label)).toEqual(["Sin acceso", "Con acceso"]);
  });
  it("los niveles globales se convierten a su versión por categoría", () => {
    expect(coerceLevelFor("viajes", "editor_global")).toBe("editor_categoria");
    expect(coerceLevelFor("viajes", "lector_global")).toBe("lector_categoria");
  });
  it("para Jugador, Ver es solo lo suyo", () => {
    expect(coerceLevelFor("salud", "lector_categoria", "jugador")).toBe("vista_jugador");
  });
});

describe("menú", () => {
  it("un módulo sin acceso no aparece en Coordinación y los demás se recorren", () => {
    const pages = resolvePagesForUser("staff", (k) => k === "viajes" || k === "inventario");
    expect(pages.find((p) => p.page.key === "coordinacion")?.modules).toEqual(["viajes", "inventario"]);
  });
  it("sin módulos de coordinación, la página Coordinación no aparece", () => {
    const pages = resolvePagesForUser("jugador", () => false);
    expect(pages.map((p) => p.page.key)).toEqual(["home", "agenda", "club"]);
  });
});
