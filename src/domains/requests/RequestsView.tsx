import { ArrowLeft, Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { ConfirmModal } from "../../shell/ui/modal";
import { origins } from "../units/rules";
import { Origin, Unit } from "../units/types";
import { colors, formatDate, formatNumber, papers, priorities, statuses, statusClass } from "./rules";
import { ColorMode, CopyRequest, PaperSize, Priority, RequestDraft, RequestStatus } from "./types";

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
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Código</th>
            {!props.compact && <th>Unidade</th>}
            <th>Documento</th>
            <th>Status</th>
            {!props.compact && <th>Prazo</th>}
            <th>Faces</th>
            {showActions && <th aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {props.requests.map((request) => (
            <tr
              key={request.id}
              className={props.selectedId === request.id ? "selected-row" : ""}
              onClick={() => props.onSelect(request.id)}
            >
              <td><strong>{request.code}</strong></td>
              {!props.compact && <td>{request.unitName}</td>}
              <td>{request.documentDescription}</td>
              <td><span className={statusClass(request.status)}>{request.status}</span></td>
              {!props.compact && <td>{formatDate(request.desiredDeadline)}</td>}
              <td>{formatNumber(request.printedFaces)}</td>
              {showActions && (
                <td onClick={(event) => event.stopPropagation()}>
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
  draft: RequestDraft;
  onDraftChange: (draft: RequestDraft) => void;
  draftTotals: { printedFaces: number; consumedSheets: number };
  mode: "list" | "form";
  editingRequestId: string;
  canEdit: boolean;
  canCreate: boolean;
  canUpdateProduction: boolean;
  onStartCreate: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
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
    draft,
    onDraftChange,
    draftTotals,
    mode,
    editingRequestId,
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
  const [isSaving, setIsSaving] = useState(false);
  const [statusChangingTo, setStatusChangingTo] = useState<RequestStatus | null>(null);

  const schoolUnits = units.filter((unit) => unit.origin === "Escola" && unit.active);
  const availableUnits = units.filter((unit) => unit.origin === draft.origin && unit.active);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit(event);
    } finally {
      setIsSaving(false);
    }
  }

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
      <form onSubmit={handleSubmit} className="panel request-form">
        <div className="panel-heading">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label="Voltar para a lista"
              className="grid h-8 w-8 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
            >
              <ArrowLeft size={18} />
            </button>
            <h2>{editingRequestId ? "Editar solicitação" : "Nova solicitação"}</h2>
          </div>
          <span>{formatNumber(draftTotals.printedFaces)} faces / {formatNumber(draftTotals.consumedSheets)} folhas</span>
        </div>
        <div className="form-grid">
          <label>
            Origem
            <select
              value={draft.origin}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  origin: event.target.value as Origin,
                  unitId: units.find((unit) => unit.origin === event.target.value)?.id ?? "",
                })
              }
            >
              {origins.map((origin) => <option key={origin}>{origin}</option>)}
            </select>
          </label>
          <label>
            Unidade / setor
            <select value={draft.unitId} onChange={(event) => onDraftChange({ ...draft, unitId: event.target.value })}>
              {availableUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </label>
          <label>Solicitante<input value={draft.requester} onChange={(event) => onDraftChange({ ...draft, requester: event.target.value })} required /></label>
          <label>Contato<input value={draft.contact} onChange={(event) => onDraftChange({ ...draft, contact: event.target.value })} required /></label>
          <label className="span-2">Descrição / documento<input value={draft.documentDescription} onChange={(event) => onDraftChange({ ...draft, documentDescription: event.target.value })} required /></label>
          <label>Páginas<input type="number" min={1} value={draft.pages} onChange={(event) => onDraftChange({ ...draft, pages: Number(event.target.value) })} /></label>
          <label>Jogos / cópias<input type="number" min={1} value={draft.copies} onChange={(event) => onDraftChange({ ...draft, copies: Number(event.target.value) })} /></label>
          <label>Papel<select value={draft.paper} onChange={(event) => onDraftChange({ ...draft, paper: event.target.value as PaperSize })}>{papers.map((paper) => <option key={paper}>{paper}</option>)}</select></label>
          <label>Cor<select value={draft.colorMode} onChange={(event) => onDraftChange({ ...draft, colorMode: event.target.value as ColorMode })}>{colors.map((color) => <option key={color}>{color}</option>)}</select></label>
          <label>Prioridade<select value={draft.priority} onChange={(event) => onDraftChange({ ...draft, priority: event.target.value as Priority })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
          <label>Prazo desejado<input type="date" value={draft.desiredDeadline} onChange={(event) => onDraftChange({ ...draft, desiredDeadline: event.target.value })} /></label>
          <label>Responsável<input value={draft.productionOwner} onChange={(event) => onDraftChange({ ...draft, productionOwner: event.target.value })} /></label>
          <label className="checkbox-label"><input type="checkbox" checked={draft.duplex} onChange={(event) => onDraftChange({ ...draft, duplex: event.target.checked })} /> Frente e verso</label>
          <label className="span-2">Observações<textarea value={draft.notes} onChange={(event) => onDraftChange({ ...draft, notes: event.target.value })} /></label>
        </div>
        <div className="form-actions">
          <button className="primary-action" type="submit" disabled={isSaving}>
            {isSaving ? <Spinner /> : editingRequestId ? <ShieldCheck size={18} /> : <Plus size={18} />}
            {isSaving ? "Salvando…" : editingRequestId ? "Salvar alterações" : "Registrar solicitação"}
          </button>
          <button className="secondary-action" type="button" onClick={onCancelEdit} disabled={isSaving}>
            <X size={17} />
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <section className="requests-layout">
        <div className="panel request-list-panel">
          <div className="toolbar">
            <label className="search-field">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Buscar por código, unidade, solicitante ou documento"
              />
            </label>
            <label className="filter-field">
              Status
              <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as RequestStatus | "Todos")}>
                <option>Todos</option>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              Origem
              <select value={originFilter} onChange={(event) => onOriginFilterChange(event.target.value as Origin | "Todas")}>
                <option>Todas</option>
                {origins.map((origin) => (
                  <option key={origin}>{origin}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              Escola
              <select value={schoolFilter} onChange={(event) => onSchoolFilterChange(event.target.value)}>
                <option value="Todas">Todas as escolas</option>
                {schoolUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </label>
            {canCreate && (
              <button
                type="button"
                onClick={onStartCreate}
                className="inline-flex items-center gap-2 rounded border-0 bg-accent-strong px-4 py-2 text-sm font-bold text-white [appearance:none] hover:opacity-90"
              >
                <Plus size={17} />
                Nova solicitação
              </button>
            )}
          </div>
          <RequestTable
            requests={filteredRequests}
            onSelect={onSelectRequest}
            selectedId={selectedRequest?.id}
            onEdit={canEdit ? onEditRequest : undefined}
            onDelete={canEdit ? (request) => setPendingDelete(request) : undefined}
          />
        </div>

        <div className="panel detail-panel">
          {selectedRequest && (
            <>
              <div className="panel-heading">
                <h2>{selectedRequest.code}</h2>
                <span className={statusClass(selectedRequest.status)}>{selectedRequest.status}</span>
              </div>
              <dl className="detail-list">
                <div><dt>Unidade</dt><dd>{selectedRequest.unitName}</dd></div>
                <div><dt>Solicitante</dt><dd>{selectedRequest.requester}</dd></div>
                <div><dt>Documento</dt><dd>{selectedRequest.documentDescription}</dd></div>
                <div><dt>Faces</dt><dd>{formatNumber(selectedRequest.printedFaces)}</dd></div>
                <div><dt>Folhas</dt><dd>{formatNumber(selectedRequest.consumedSheets)}</dd></div>
                <div><dt>Prazo</dt><dd>{formatDate(selectedRequest.desiredDeadline)}</dd></div>
              </dl>
              {canEdit && (
                <div className="record-actions">
                  <button type="button" onClick={() => onEditRequest(selectedRequest)}>
                    <Pencil size={17} />
                    Editar solicitação
                  </button>
                  <button className="danger" type="button" onClick={() => setPendingDelete(selectedRequest)}>
                    <Trash2 size={17} />
                    Excluir solicitação
                  </button>
                </div>
              )}
              {canUpdateProduction && (
                <div className="status-actions">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      disabled={statusChangingTo !== null}
                      onClick={() => handleStatusClick(status)}
                    >
                      {statusChangingTo === status ? "Aplicando…" : status}
                    </button>
                  ))}
                </div>
              )}
              <h3>Histórico</h3>
              <ol className="history-list">
                {selectedRequest.history.map((entry, index) => (
                  <li key={`${entry.status}-${entry.date}-${index}`}>
                    <strong>{entry.status}</strong>
                    <span>{formatDate(entry.date)} por {entry.by}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
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
