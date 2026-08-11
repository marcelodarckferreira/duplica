import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { Card, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Checkbox } from "../../../shared/ui/checkbox";
import { ConfirmModal } from "../../../shared/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { cn } from "../../../shared/lib/utils";
import { origins } from "../../units/model/rules";
import { Origin, Unit } from "../../units/model/types";
import { calculatePrintTotals, colors, emptyDraft, formatDate, formatNumber, papers, priorities, requestToDraft, statuses, statusVariant } from "../model/rules";
import { requestDraftSchema } from "../schemas/schema";
import { CopyRequest, RequestDraft, RequestStatus } from "../model/types";

function Spinner(props: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={props.className ?? "h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"}
    />
  );
}

export function RequestTable(props: {
  requests: CopyRequest[];
  selectedId?: string;
  compact?: boolean;
  onSelect: (id: string) => void;
  onEdit?: (request: CopyRequest) => void;
  onDelete?: (request: CopyRequest) => void;
}) {
  const showActions = !props.compact && Boolean(props.onEdit || props.onDelete);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Código</th>
            {!props.compact && <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Unidade</th>}
            <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Documento</th>
            <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Status</th>
            {!props.compact && <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Prazo</th>}
            <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Faces</th>
            {showActions && <th className="border-b border-border px-2.5 py-2.5" aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {props.requests.map((request) => (
            <tr
              key={request.id}
              className={cn(
                "cursor-pointer hover:bg-surface-hover",
                props.selectedId === request.id && "bg-surface-hover",
              )}
              onClick={() => props.onSelect(request.id)}
            >
              <td className="border-b border-border-soft px-2.5 py-2.5"><strong>{request.code}</strong></td>
              {!props.compact && <td className="border-b border-border-soft px-2.5 py-2.5">{request.unitName}</td>}
              <td className="border-b border-border-soft px-2.5 py-2.5">{request.documentDescription}</td>
              <td className="border-b border-border-soft px-2.5 py-2.5"><Badge variant={statusVariant(request.status)}>{request.status}</Badge></td>
              {!props.compact && <td className="border-b border-border-soft px-2.5 py-2.5">{formatDate(request.desiredDeadline)}</td>}
              <td className="border-b border-border-soft px-2.5 py-2.5">{formatNumber(request.printedFaces)}</td>
              {showActions && (
                <td className="border-b border-border-soft px-2.5 py-2.5" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {props.onEdit && (
                      <button
                        type="button"
                        aria-label={`Editar ${request.code}`}
                        onClick={() => props.onEdit?.(request)}
                        className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {props.onDelete && (
                      <button
                        type="button"
                        aria-label={`Excluir ${request.code}`}
                        onClick={() => props.onDelete?.(request)}
                        className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-[#9b3d35] [appearance:none] hover:bg-surface-soft"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestForm(props: {
  units: Unit[];
  editingRequest: CopyRequest | undefined;
  onSubmit: (values: RequestDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const { units, editingRequest, onSubmit, onCancel } = props;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RequestDraft>({
    resolver: zodResolver(requestDraftSchema),
    defaultValues: editingRequest
      ? requestToDraft(editingRequest)
      : { ...emptyDraft, unitId: units.find((unit) => unit.origin === "Escola")?.id ?? "" },
  });

  const [origin, pages, copies, duplex] = watch(["origin", "pages", "copies", "duplex"]);
  const totals = calculatePrintTotals({ pages: Number(pages) || 0, copies: Number(copies) || 0, duplex });
  const availableUnits = units.filter((unit) => unit.origin === origin && unit.active);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-lg border border-border bg-surface p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Voltar para a lista"
            className="grid h-8 w-8 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="m-0 text-[1.08rem] font-bold text-text">{editingRequest ? "Editar solicitação" : "Nova solicitação"}</h2>
        </div>
        <span className="text-sm text-muted">{formatNumber(totals.printedFaces)} faces / {formatNumber(totals.consumedSheets)} folhas</span>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Origem
          <Select
            value={origin}
            onValueChange={(nextOrigin) => {
              setValue("origin", nextOrigin as Origin, { shouldValidate: true });
              setValue("unitId", units.find((unit) => unit.origin === nextOrigin)?.id ?? "", { shouldValidate: true });
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {origins.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Unidade / setor
          <Select value={watch("unitId")} onValueChange={(value) => setValue("unitId", value, { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.unitId && <p className="m-0 font-bold text-[#a43b2f]">{errors.unitId.message}</p>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Solicitante
          <input className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" {...register("requester")} />
          {errors.requester && <p className="m-0 font-bold text-[#a43b2f]">{errors.requester.message}</p>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Contato
          <input className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" {...register("contact")} />
          {errors.contact && <p className="m-0 font-bold text-[#a43b2f]">{errors.contact.message}</p>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label sm:col-span-2">
          Descrição / documento
          <input className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" {...register("documentDescription")} />
          {errors.documentDescription && <p className="m-0 font-bold text-[#a43b2f]">{errors.documentDescription.message}</p>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Páginas
          <input
            type="number"
            min={1}
            className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            {...register("pages", { valueAsNumber: true })}
          />
          {errors.pages && <p className="m-0 font-bold text-[#a43b2f]">{errors.pages.message}</p>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Jogos / cópias
          <input
            type="number"
            min={1}
            className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            {...register("copies", { valueAsNumber: true })}
          />
          {errors.copies && <p className="m-0 font-bold text-[#a43b2f]">{errors.copies.message}</p>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Papel
          <Select value={watch("paper")} onValueChange={(value) => setValue("paper", value as RequestDraft["paper"], { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{papers.map((paper) => <SelectItem key={paper} value={paper}>{paper}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Cor
          <Select value={watch("colorMode")} onValueChange={(value) => setValue("colorMode", value as RequestDraft["colorMode"], { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{colors.map((color) => <SelectItem key={color} value={color}>{color}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Prioridade
          <Select value={watch("priority")} onValueChange={(value) => setValue("priority", value as RequestDraft["priority"], { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{priorities.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Prazo desejado
          <input
            type="date"
            className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            {...register("desiredDeadline")}
          />
          {errors.desiredDeadline && <p className="m-0 font-bold text-[#a43b2f]">{errors.desiredDeadline.message}</p>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label">
          Responsável
          <input className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" {...register("productionOwner")} />
        </label>
        <label className="flex items-center gap-2 self-end text-sm font-bold text-label">
          <Checkbox checked={duplex} onCheckedChange={(checked) => setValue("duplex", checked === true)} />
          Frente e verso
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-label sm:col-span-2 lg:col-span-4">
          Observações
          <textarea
            className="min-h-[82px] w-full resize-y rounded border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            {...register("notes")}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner /> : editingRequest ? <ShieldCheck size={18} /> : <Plus size={18} />}
          {isSubmitting ? "Salvando…" : editingRequest ? "Salvar alterações" : "Registrar solicitação"}
        </Button>
        <Button type="button" variant="soft" onClick={onCancel} disabled={isSubmitting}>
          <X size={17} />
          Cancelar
        </Button>
      </div>
    </form>
  );
}

const filterSelectClasses = "h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function RequestsView(props: {
  units: Unit[];
  filteredRequests: CopyRequest[];
  selectedRequest: CopyRequest | undefined;
  onSelectRequest: (id: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: RequestStatus | "Todos";
  onStatusFilterChange: (value: RequestStatus | "Todos") => void;
  originFilter: Origin | "Todas";
  onOriginFilterChange: (value: Origin | "Todas") => void;
  schoolFilter: string;
  onSchoolFilterChange: (value: string) => void;
  mode: "list" | "form";
  editingRequest: CopyRequest | undefined;
  canEdit: boolean;
  canCreate: boolean;
  canUpdateProduction: boolean;
  onStartCreate: () => void;
  onSubmit: (values: RequestDraft) => Promise<void>;
  onEditRequest: (request: CopyRequest) => void;
  onCancelEdit: () => void;
  onDeleteRequest: (request: CopyRequest) => Promise<void>;
  onStatusChange: (request: CopyRequest, status: RequestStatus) => Promise<void>;
}) {
  const {
    units,
    filteredRequests,
    selectedRequest,
    onSelectRequest,
    query,
    onQueryChange,
    statusFilter,
    onStatusFilterChange,
    originFilter,
    onOriginFilterChange,
    schoolFilter,
    onSchoolFilterChange,
    mode,
    editingRequest,
    canEdit,
    canCreate,
    canUpdateProduction,
    onStartCreate,
    onSubmit,
    onEditRequest,
    onCancelEdit,
    onDeleteRequest,
    onStatusChange,
  } = props;

  const [pendingDelete, setPendingDelete] = useState<CopyRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusChangingTo, setStatusChangingTo] = useState<RequestStatus | null>(null);

  const schoolUnits = units.filter((unit) => unit.origin === "Escola" && unit.active);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteRequest(pendingDelete);
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleStatusClick(status: RequestStatus) {
    if (!selectedRequest) return;
    setStatusChangingTo(status);
    try {
      await onStatusChange(selectedRequest, status);
    } finally {
      setStatusChangingTo(null);
    }
  }

  if (mode === "form") {
    return (
      <RequestForm
        key={editingRequest?.id ?? "new"}
        units={units}
        editingRequest={editingRequest}
        onSubmit={onSubmit}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <>
      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.65fr)]">
        <Card>
          <div className="mb-3.5 grid grid-cols-1 items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_160px_150px_minmax(190px,0.8fr)]">
            <label className="relative block">
              <Search size={17} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Buscar por código, unidade, solicitante ou documento"
                className="h-11 w-full rounded border border-border bg-surface pl-9 pr-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase text-label">
              Status
              <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as RequestStatus | "Todos")} className={filterSelectClasses}>
                <option>Todos</option>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase text-label">
              Origem
              <select value={originFilter} onChange={(event) => onOriginFilterChange(event.target.value as Origin | "Todas")} className={filterSelectClasses}>
                <option>Todas</option>
                {origins.map((origin) => (
                  <option key={origin}>{origin}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase text-label">
              Escola
              <select value={schoolFilter} onChange={(event) => onSchoolFilterChange(event.target.value)} className={filterSelectClasses}>
                <option value="Todas">Todas as escolas</option>
                {schoolUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </label>
            {canCreate && (
              <Button type="button" onClick={onStartCreate} className="sm:col-span-2 lg:col-span-1">
                <Plus size={17} />
                Nova solicitação
              </Button>
            )}
          </div>
          <RequestTable
            requests={filteredRequests}
            onSelect={onSelectRequest}
            selectedId={selectedRequest?.id}
            onEdit={canEdit ? onEditRequest : undefined}
            onDelete={canEdit ? (request) => setPendingDelete(request) : undefined}
          />
        </Card>

        <Card>
          {selectedRequest && (
            <>
              <CardHeader>
                <CardTitle>{selectedRequest.code}</CardTitle>
                <Badge variant={statusVariant(selectedRequest.status)}>{selectedRequest.status}</Badge>
              </CardHeader>
              <dl className="m-0 grid gap-2.5">
                {(
                  [
                    ["Unidade", selectedRequest.unitName],
                    ["Solicitante", selectedRequest.requester],
                    ["Documento", selectedRequest.documentDescription],
                    ["Faces", formatNumber(selectedRequest.printedFaces)],
                    ["Folhas", formatNumber(selectedRequest.consumedSheets)],
                    ["Prazo", formatDate(selectedRequest.desiredDeadline)],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-3 border-b border-border-soft py-2.5">
                    <dt className="font-extrabold text-muted">{label}</dt>
                    <dd className="m-0">{value}</dd>
                  </div>
                ))}
              </dl>
              {canEdit && (
                <div className="my-4 flex flex-wrap gap-2">
                  <Button type="button" variant="soft" size="sm" onClick={() => onEditRequest(selectedRequest)}>
                    <Pencil size={17} />
                    Editar solicitação
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => setPendingDelete(selectedRequest)}>
                    <Trash2 size={17} />
                    Excluir solicitação
                  </Button>
                </div>
              )}
              {canUpdateProduction && (
                <div className="my-4 flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      disabled={statusChangingTo !== null}
                      onClick={() => handleStatusClick(status)}
                      className="rounded border-0 bg-surface-soft px-2.5 py-2 text-sm font-bold text-text [appearance:none] hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {statusChangingTo === status ? "Aplicando…" : status}
                    </button>
                  ))}
                </div>
              )}
              <h3 className="text-base font-bold text-text">Histórico</h3>
              <ol className="m-0 grid gap-2.5 pl-5">
                {selectedRequest.history.map((entry, index) => (
                  <li key={`${entry.status}-${entry.date}-${index}`} className="marker:text-accent">
                    <strong>{entry.status}</strong>
                    <span className="block text-sm text-muted">{formatDate(entry.date)} por {entry.by}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card>
      </section>

      <ConfirmModal
        open={pendingDelete !== null}
        title="Excluir solicitação"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir a solicitação ${pendingDelete.code}? Essa ação não pode ser desfeita.`
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
