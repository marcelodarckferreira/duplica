import { Origin } from "./types";

export const origins: Origin[] = ["ESCOLA", "SEDE"];

export function generateUnitId(name: string): string {
  return name
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
