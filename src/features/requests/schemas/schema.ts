import { z } from "zod";
import { origins } from "../../units/model/rules";
import { Origin } from "../../units/model/types";
import { colors, layouts, papers, priorities, staples } from "../model/rules";
import { ColorMode, Layout, PaperSize, Priority, Staple } from "../model/types";

export const requestDraftSchema = z.object({
  origin: z.enum(origins as [Origin, ...Origin[]]),
  unitId: z.string().min(1, "Selecione a unidade / setor."),
  personId: z.string().min(1, "Selecione a pessoa."),
  requester: z.string().trim().min(1, "Informe o solicitante."),
  registrationNumber: z.string().trim(),
  contact: z.string().trim(),
  documentDescription: z.string().trim().min(1, "Descreva o documento."),
  pages: z.coerce.number().int("Use um número inteiro.").positive("Informe ao menos 1 página."),
  copies: z.coerce.number().int("Use um número inteiro.").positive("Informe ao menos 1 cópia."),
  duplex: z.boolean(),
  staple: z.enum(staples as [Staple, ...Staple[]]),
  layout: z.enum(layouts as [Layout, ...Layout[]]),
  paper: z.enum(papers as [PaperSize, ...PaperSize[]]),
  colorMode: z.enum(colors as [ColorMode, ...ColorMode[]]),
  priority: z.enum(priorities as [Priority, ...Priority[]]),
  desiredDeadline: z.string().min(1, "Informe o prazo desejado."),
  productionOwner: z.string().trim(),
  notes: z.string().trim(),
});

export type RequestDraftInput = z.infer<typeof requestDraftSchema>;
