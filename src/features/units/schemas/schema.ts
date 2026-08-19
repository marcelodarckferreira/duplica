import { z } from "zod";
import { origins } from "../model/rules";
import { Origin } from "../model/types";

export const unitDraftSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  origin: z.enum(origins as [Origin, ...Origin[]]),
  contact: z.string().trim(),
});

export type UnitDraftInput = z.infer<typeof unitDraftSchema>;
