import { describe, expect, it } from "vitest";
import { generateUnitId } from "./rules";

describe("units domain rules", () => {
  it("slugifies unit names into ids", () => {
    expect(generateUnitId("EMEF Paulo Freire")).toBe("emef-paulo-freire");
    expect(generateUnitId("Sede - Coordenação Pedagógica")).toBe("sede-coordenacao-pedagogica");
    expect(generateUnitId("  Ana Nery  ")).toBe("ana-nery");
  });
});
