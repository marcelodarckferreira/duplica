import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Ban, CheckCircle2, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { ConfirmModal } from "../../../shared/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { cn, formatPhone } from "../../../shared/lib/utils";
import { origins } from "../model/rules";
import { unitDraftSchema, UnitDraftInput } from "../schemas/schema";
import { Origin, Unit } from "../model/types";

const fieldClasses = "h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function FieldError(props: { message?: string }) {
  return <p className="m-0 min-h-[17px] font-bold text-[#a43b2f]">{props.message}</p>;
}

function UnitForm(props: {
  editingUnit: Unit | undefined;
  unitMessage: string;
  onSubmit: (values: UnitDraftInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { editingUnit, unitMessage, onSubmit, onCancel } = props;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UnitDraftInput>({
    resolver: zodResolver(unitDraftSchema),
    defaultValues: editingUnit
      ? { name: editingUnit.name, origin: editingUnit.origin, contact: editingUnit.contact ?? "" }
      : { name: "", origin: "Escola", contact: "" },
  });

  return (
    <form className="grid gap-4 rounded-lg border border-border bg-surface p-[18px]" onSubmit={handleSubmit(onSubmit)}>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
            onClick={onCancel}
            aria-label="Voltar para a lista"
          >
            <ArrowLeft size={18} />
          </button>
          <CardTitle>{editingUnit ? "Editar local" : "Novo local"}</CardTitle>
        </div>
        <CardDescription>Escola ou setor</CardDescription>
      </CardHeader>
      <div>
        <p className="m-0 mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Identificação</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
            Código
            <input
              className={cn(fieldClasses, "cursor-not-allowed text-muted")}
              value={editingUnit ? editingUnit.code : "Gerado automaticamente ao salvar"}
              readOnly
              disabled
            />
            <FieldError />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
            Nome
            <input className={fieldClasses} {...register("name")} />
            <FieldError message={errors.name?.message} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
            Origem
            <Select value={watch("origin")} onValueChange={(value) => setValue("origin", value as UnitDraftInput["origin"], { shouldValidate: true })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {origins.map((origin) => <SelectItem key={origin} value={origin}>{origin}</SelectItem>)}
              </SelectContent>
            </Select>
            <FieldError />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
            Celular
            <input
              className={fieldClasses}
              placeholder="(00) 00000-0000"
              value={watch("contact")}
              onChange={(event) => setValue("contact", formatPhone(event.target.value), { shouldValidate: true })}
            />
            <FieldError message={errors.contact?.message} />
          </label>
        </div>
      </div>
      {unitMessage && <p className="m-0 font-bold text-accent">{unitMessage}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          <ShieldCheck size={18} /> {isSubmitting ? "Salvando…" : "Salvar local"}
        </Button>
        <Button type="button" variant="soft" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function UnitsView(props: {
  units: Unit[];
  unitIdsWithRequests: Set<string>;
  editingUnit: Unit | undefined;
  unitMessage: string;
  mode: "list" | "form";
  canManage: boolean;
  onStartCreate: () => void;
  onSubmit: (values: UnitDraftInput) => Promise<void>;
  onEditUnit: (unit: Unit) => void;
  onToggleUnitActive: (unit: Unit) => void;
  onDeleteUnit: (unit: Unit) => Promise<void>;
  onCancelEdit: () => void;
}) {
  const {
    units,
    unitIdsWithRequests,
    editingUnit,
    unitMessage,
    mode,
    canManage,
    onStartCreate,
    onSubmit,
    onEditUnit,
    onToggleUnitActive,
    onDeleteUnit,
    onCancelEdit,
  } = props;

  const [pendingDelete, setPendingDelete] = useState<Unit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<Origin | "Todas">("Todas");

  const normalizedQuery = nameQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredUnits = units.filter((unit) => {
    const matchesName = unit.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
    const matchesOrigin = originFilter === "Todas" || unit.origin === originFilter;
    return matchesName && matchesOrigin;
  });

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteUnit(pendingDelete);
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  if (mode === "form") {
    return (
      <UnitForm
        key={editingUnit?.id ?? "new"}
        editingUnit={editingUnit}
        unitMessage={unitMessage}
        onSubmit={onSubmit}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <>
      <Card>
        <div className="mb-3.5 grid grid-cols-1 items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_200px_190px]">
          <label className="relative block">
            <Search size={17} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
              placeholder="Buscar por nome"
              className="h-11 w-full rounded border border-border bg-surface pl-9 pr-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold uppercase text-label">
            Origem
            <select value={originFilter} onChange={(event) => setOriginFilter(event.target.value as Origin | "Todas")} className={fieldClasses}>
              <option>Todas</option>
              {origins.map((origin) => (
                <option key={origin}>{origin}</option>
              ))}
            </select>
          </label>
          {canManage && (
            <Button type="button" onClick={onStartCreate} className="self-end sm:col-span-2 lg:col-span-1">
              <Plus size={17} /> Novo local
            </Button>
          )}
        </div>
        <p className="m-0 mb-3.5 text-sm text-muted">{filteredUnits.length} cadastrados</p>
        {unitMessage && <p className="m-0 mb-3 font-bold text-accent">{unitMessage}</p>}
        <div className="grid max-h-[560px] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 overflow-y-auto pr-1">
          {filteredUnits.map((unit) => (
            <article className="grid gap-1.5 rounded-lg border border-border bg-surface p-3.5" key={unit.id}>
              <div className="flex items-start justify-between gap-2">
                <strong className="text-text">{unit.name}</strong>
                <Badge variant={unit.active ? "active" : "inactive"}>{unit.active ? "Ativa" : "Inativa"}</Badge>
              </div>
              <span className="text-muted">{unit.code}</span>
              <em className="not-italic text-muted">{unit.origin}</em>
              {unit.contact && <span className="text-muted">{unit.contact}</span>}
              {canManage && (
                <div className="mt-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
                    aria-label={`Editar ${unit.name}`}
                    onClick={() => onEditUnit(unit)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-[#9b3d35]"
                    aria-label={unit.active ? `Desativar ${unit.name}` : `Ativar ${unit.name}`}
                    onClick={() => onToggleUnitActive(unit)}
                  >
                    {unit.active ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                  </button>
                  {!unitIdsWithRequests.has(unit.id) && (
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-[#9b3d35]"
                      aria-label={`Excluir ${unit.name}`}
                      onClick={() => setPendingDelete(unit)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </Card>

      <ConfirmModal
        open={pendingDelete !== null}
        title="Excluir local"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir ${pendingDelete.name}? Essa ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir"
        danger
        isConfirming={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
