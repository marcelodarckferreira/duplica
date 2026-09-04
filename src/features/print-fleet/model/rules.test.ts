import { describe, expect, it } from "vitest";
import { discoveryProgress, formatSupplyLevel, supplyTone } from "./rules";

describe("print fleet rules", () => {
  it("calculates bounded discovery progress", () => {
    expect(discoveryProgress({ scannedTargets: 25, totalTargets: 100 })).toBe(25);
    expect(discoveryProgress({ scannedTargets: 9, totalTargets: 0 })).toBe(0);
    expect(discoveryProgress({ scannedTargets: 120, totalTargets: 100 })).toBe(100);
  });

  it("formats known and unavailable supply levels", () => {
    expect(formatSupplyLevel(18.49)).toBe("18%");
    expect(formatSupplyLevel(null)).toBe("Indisponível");
  });

  it("maps supply alerts to stable visual tones", () => {
    expect(supplyTone("critical")).toBe("danger");
    expect(supplyTone("warning")).toBe("warning");
    expect(supplyTone("ok")).toBe("active");
    expect(supplyTone("unknown")).toBe("neutral");
  });
});
