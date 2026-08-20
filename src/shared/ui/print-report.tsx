import { Printer } from "lucide-react";
import { Button } from "./button";

export function PrintButton(props: { label?: string }) {
  return (
    <Button type="button" variant="default" onClick={() => window.print()} className="print:hidden">
      <Printer size={17} />
      {props.label ?? "Imprimir"}
    </Button>
  );
}

export function PrintReportHeader(props: { title: string; subtitle?: string }) {
  const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());

  return (
    <div className="hidden print:mb-4 print:block">
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-muted">Duplica — Controle de Impressão</p>
      <h2 className="m-0 mt-1 text-xl font-bold text-text">{props.title}</h2>
      {props.subtitle && <p className="m-0 mt-1 text-sm text-muted">{props.subtitle}</p>}
      <p className="m-0 mt-1 text-xs text-muted">Gerado em {generatedAt}</p>
      <hr className="mb-0 mt-3 border-border" />
    </div>
  );
}
