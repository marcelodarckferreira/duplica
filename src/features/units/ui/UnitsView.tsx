import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "../../../shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { origins } from "../model/rules";
import { unitDraftSchema, UnitDraftInput } from "../schemas/schema";
import { Unit } from "../model/types";

const emptyUnitDraft: UnitDraftInput = { name: "", code: "", origin: "Escola" };
const fieldClasses = "h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function UnitsView(props: {
  units: Unit[];
  canManage: boolean;
  onSubmit: (values: UnitDraftInput) => Promise<void>;
}) {
  const { units, canManage, onSubmit } = props;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UnitDraftInput>({
    resolver: zodResolver(unitDraftSchema),
    defaultValues: emptyUnitDraft,
  });

  async function submit(values: UnitDraftInput) {
    await onSubmit(values);
    reset(emptyUnitDraft);
  }

  return (
    <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Unidades escolares e setores</CardTitle>
          <CardDescription>{units.length} cadastrados</CardDescription>
        </CardHeader>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {units.map((unit) => (
            <article className="grid gap-1.5 rounded-lg border border-border bg-surface p-3.5" key={unit.id}>
              <strong className="text-text">{unit.name}</strong>
              <span className="text-muted">{unit.code}</span>
              <em className="not-italic text-muted">{unit.origin}</em>
            </article>
          ))}
        </div>
      </Card>
      {canManage && (
        <form className="grid gap-3.5 rounded-lg border border-border bg-surface p-[18px]" onSubmit={handleSubmit(submit)}>
          <CardHeader>
            <CardTitle>Novo cadastro</CardTitle>
            <CardDescription>Escola ou setor</CardDescription>
          </CardHeader>
          <label className="grid gap-1.5 text-sm font-bold text-label">
            Nome
            <input className={fieldClasses} {...register("name")} />
            {errors.name && <p className="m-0 font-bold text-[#a43b2f]">{errors.name.message}</p>}
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-label">
            Código
            <input className={fieldClasses} {...register("code")} />
            {errors.code && <p className="m-0 font-bold text-[#a43b2f]">{errors.code.message}</p>}
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-label">
            Origem
            <Select value={watch("origin")} onValueChange={(value) => setValue("origin", value as UnitDraftInput["origin"], { shouldValidate: true })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {origins.map((origin) => <SelectItem key={origin} value={origin}>{origin}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <Button type="submit" disabled={isSubmitting} className="mt-1">
            <Plus size={18} /> {isSubmitting ? "Salvando…" : "Salvar unidade"}
          </Button>
        </form>
      )}
    </section>
  );
}
