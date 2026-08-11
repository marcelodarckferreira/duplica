import { z } from "zod";
import { origins } from "../model/rules";
import { Origin } from "../model/types";

export const unitDraftSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  code: z.string().trim().min(1, "Informe o código."),
  origin: z.enum(origins as [Origin, ...Origin[]]),
});

export type UnitDraftInput = z.infer<typeof unitDraftSchema>;
