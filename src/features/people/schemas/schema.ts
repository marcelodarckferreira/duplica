import { z } from "zod";

export const personDraftSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  registrationNumber: z.string().trim(),
  phone: z.string().trim(),
  unitId: z.string().min(1, "Selecione o local."),
});

export type PersonDraftInput = z.infer<typeof personDraftSchema>;
