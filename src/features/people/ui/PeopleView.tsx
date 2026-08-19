import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Ban, CheckCircle2, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../shared/ui/card";
import { ConfirmModal } from "../../../shared/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { formatPhone } from "../../../shared/lib/utils";
import { Unit } from "../../units/model/types";
import { personDraftSchema, PersonDraftInput } from "../schemas/schema";
import { Person } from "../model/types";

const fieldClasses = "h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function FieldError(props: { message?: string }) {
  return <p className="m-0 min-h-[17px] font-bold text-[#a43b2f]">{props.message}</p>;
}

function PersonForm(props: {
  units: Unit[];
  editingPerson: Person | undefined;
  personMessage: string;
  onSubmit: (values: PersonDraftInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { units, editingPerson, personMessage, onSubmit, onCancel } = props;
  const activeUnits = units.filter((unit) => unit.active);
  const unitSearchInputRef = useRef<HTMLInputElement>(null);
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const [isUnitSelectOpen, setIsUnitSelectOpen] = useState(false);
  const filteredUnits = activeUnits.filter((unit) =>
    unit.name.toLowerCase().includes(unitSearchQuery.trim().toLowerCase()),
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PersonDraftInput>({
    resolver: zodResolver(personDraftSchema),
    defaultValues: editingPerson
      ? {
          name: editingPerson.name,
          registrationNumber: editingPerson.registrationNumber,
          phone: editingPerson.phone,
          unitId: editingPerson.unitId,
        }
      : { name: "", registrationNumber: "", phone: "", unitId: activeUnits[0]?.id ?? "" },
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
          <CardTitle>{editingPerson ? "Editar pessoa" : "Nova pessoa"}</CardTitle>
        </div>
        <CardDescription>Solicitante vinculado a um local</CardDescription>
      </CardHeader>
      <div>
        <p className="m-0 mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Identificação</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
            Nome
            <input className={fieldClasses} {...register("name")} />
            <FieldError message={errors.name?.message} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
            Matrícula
            <input className={fieldClasses} {...register("registrationNumber")} />
            <FieldError />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
            Celular
            <input
              className={fieldClasses}
              placeholder="(00) 00000-0000"
              value={watch("phone")}
              onChange={(event) => setValue("phone", formatPhone(event.target.value), { shouldValidate: true })}
            />
            <FieldError message={errors.phone?.message} />
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
            Local
            <Select
              value={watch("unitId")}
              onValueChange={(value) => setValue("unitId", value, { shouldValidate: true })}
              open={isUnitSelectOpen}
              onOpenChange={(open) => {
                setIsUnitSelectOpen(open);
                if (open) {
                  window.setTimeout(() => unitSearchInputRef.current?.focus(), 0);
                } else {
                  setUnitSearchQuery("");
                }
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <div className="sticky -top-1 z-10 -mx-1 -mt-1 mb-1 border-b border-border bg-surface p-1.5">
                  <div className="relative">
                    <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      ref={unitSearchInputRef}
                      value={unitSearchQuery}
                      onChange={(event) => setUnitSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.preventDefault();
                        if (event.key !== "Escape") event.stopPropagation();
                      }}
                      placeholder="Pesquisar local..."
                      className="h-9 w-full rounded border border-border bg-surface pl-8 pr-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  </div>
                </div>
                {filteredUnits.length === 0 ? (
                  <p className="m-0 px-3 py-2 text-sm text-muted">Nenhum local encontrado.</p>
                ) : (
                  filteredUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)
                )}
              </SelectContent>
            </Select>
            <FieldError message={errors.unitId?.message} />
          </label>
        </div>
      </div>
      {personMessage && <p className="m-0 font-bold text-accent">{personMessage}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          <ShieldCheck size={18} /> {isSubmitting ? "Salvando…" : "Salvar pessoa"}
        </Button>
        <Button type="button" variant="soft" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function PeopleView(props: {
  people: Person[];
  units: Unit[];
  personIdsWithRequests: Set<string>;
  editingPerson: Person | undefined;
  personMessage: string;
  mode: "list" | "form";
  canManage: boolean;
  onStartCreate: () => void;
  onSubmit: (values: PersonDraftInput) => Promise<void>;
  onEditPerson: (person: Person) => void;
  onTogglePersonActive: (person: Person) => void;
  onDeletePerson: (person: Person) => Promise<void>;
  onCancelEdit: () => void;
}) {
  const {
    people,
    units,
    personIdsWithRequests,
    editingPerson,
    personMessage,
    mode,
    canManage,
    onStartCreate,
    onSubmit,
    onEditPerson,
    onTogglePersonActive,
    onDeletePerson,
    onCancelEdit,
  } = props;

  const [pendingDelete, setPendingDelete] = useState<Person | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("Todos");

  const unitNameById = new Map(units.map((unit) => [unit.id, unit.name]));
  const normalizedQuery = nameQuery.trim().toLocaleLowerCase("pt-BR");
  const filteredPeople = people.filter((person) => {
    const matchesName = person.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
    const matchesUnit = unitFilter === "Todos" || person.unitId === unitFilter;
    return matchesName && matchesUnit;
  });

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await onDeletePerson(pendingDelete);
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  if (mode === "form") {
    return (
      <PersonForm
        key={editingPerson?.id ?? "new"}
        units={units}
        editingPerson={editingPerson}
        personMessage={personMessage}
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
            Local
            <select value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)} className={fieldClasses}>
              <option value="Todos">Todos</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
          </label>
          {canManage && (
            <Button type="button" onClick={onStartCreate} className="self-end sm:col-span-2 lg:col-span-1">
              <Plus size={17} /> Nova pessoa
            </Button>
          )}
        </div>
        <p className="m-0 mb-3.5 text-sm text-muted">{filteredPeople.length} cadastradas</p>
        {personMessage && <p className="m-0 mb-3 font-bold text-accent">{personMessage}</p>}
        <div className="grid max-h-[560px] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 overflow-y-auto pr-1">
          {filteredPeople.map((person) => (
            <article className="grid gap-1.5 rounded-lg border border-border bg-surface p-3.5" key={person.id}>
              <div className="flex items-start justify-between gap-2">
                <strong className="text-text">{person.name}</strong>
                <Badge variant={person.active ? "active" : "inactive"}>{person.active ? "Ativa" : "Inativa"}</Badge>
              </div>
              <em className="not-italic text-muted">{unitNameById.get(person.unitId) ?? "—"}</em>
              {person.registrationNumber && <span className="text-muted">Matrícula: {person.registrationNumber}</span>}
              {person.phone && <span className="text-muted">{person.phone}</span>}
              {canManage && (
                <div className="mt-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
                    aria-label={`Editar ${person.name}`}
                    onClick={() => onEditPerson(person)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-[#9b3d35]"
                    aria-label={person.active ? `Desativar ${person.name}` : `Ativar ${person.name}`}
                    onClick={() => onTogglePersonActive(person)}
                  >
                    {person.active ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                  </button>
                  {!personIdsWithRequests.has(person.id) && (
                    <button
                      type="button"
                      className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-[#9b3d35]"
                      aria-label={`Excluir ${person.name}`}
                      onClick={() => setPendingDelete(person)}
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
        title="Excluir pessoa"
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
