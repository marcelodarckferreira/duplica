import { describe, expect, it } from "vitest";
import { canPerform } from "./rules";
import { UserRole } from "./types";

describe("users domain rules", () => {
  it("applies role permissions", () => {
    expect(canPerform("Admin" satisfies UserRole, "manageUnits")).toBe(true);
    expect(canPerform("Admin" satisfies UserRole, "manageUsers")).toBe(true);
    expect(canPerform("Operador" satisfies UserRole, "updateProduction")).toBe(true);
    expect(canPerform("Operador" satisfies UserRole, "manageUsers")).toBe(false);
    expect(canPerform("Consulta" satisfies UserRole, "editRequests")).toBe(false);
    expect(canPerform("Admin" satisfies UserRole, "manageAudit")).toBe(true);
    expect(canPerform("Operador" satisfies UserRole, "manageAudit")).toBe(false);
  });
});
