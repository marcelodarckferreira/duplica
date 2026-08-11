import { z } from "zod";
import { origins } from "../../units/model/rules";
import { Origin } from "../../units/model/types";
import { colors, papers, priorities } from "../model/rules";
import { ColorMode, PaperSize, Priority } from "../model/types";

export const requestDraftSchema = z.object({
  origin: z.enum(origins as [Origin, ...Origin[]]),
  unitId: z.string().min(1, "Selecione a unidade / setor."),
  requester: z.string().trim().min(1, "Informe o solicitante."),
  contact: z.string().trim().min(1, "Informe o contato."),
  documentDescription: z.string().trim().min(1, "Descreva o documento."),
  pages: z.coerce.number().int("Use um número inteiro.").positive("Informe ao menos 1 página."),
  copies: z.coerce.number().int("Use um número inteiro.").positive("Informe ao menos 1 cópia."),
  duplex: z.boolean(),
  paper: z.enum(papers as [PaperSize, ...PaperSize[]]),
  colorMode: z.enum(colors as [ColorMode, ...ColorMode[]]),
  priority: z.enum(priorities as [Priority, ...Priority[]]),
  desiredDeadline: z.string().min(1, "Informe o prazo desejado."),
  productionOwner: z.string().trim(),
  notes: z.string().trim(),
});

export type RequestDraftInput = z.infer<typeof requestDraftSchema>;
