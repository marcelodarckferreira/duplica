import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, ChevronDown, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { Fragment, FormEvent, ReactNode, RefObject, useRef, useState } from "react";
import { SignaturePad, SignaturePadHandle } from "../../../shared/ui/signature-pad";
import { useForm } from "react-hook-form";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { WhatsAppLink } from "../../../shared/ui/whatsapp-link";
import { Input } from "../../../shared/ui/input";
import { Card } from "../../../shared/ui/card";
import { ConfirmModal } from "../../../shared/ui/modal";
import { PrintButton, PrintReportHeader } from "../../../shared/ui/print-report";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../shared/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../shared/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/ui/select";
import { cn, formatPhone } from "../../../shared/lib/utils";
import { origins } from "../../units/model/rules";
import { Origin, Unit } from "../../units/model/types";
import { Person } from "../../people/model/types";
import { calculatePrintTotals, colors, emptyDraft, formatDate, formatNumber, isStatusSelectable, layouts, papers, priorities, requestToDraft, staples, statuses, statusVariant } from "../model/rules";
import { requestDraftSchema } from "../schemas/schema";
import { CopyRequest, RequestDraft, RequestStatus } from "../model/types";
import { User } from "../../users/model/types";

function buildStatusWhatsAppMessage(request: CopyRequest): string {
  const signature = request.productionOwner ? `${request.productionOwner}: ` : "";
  const pickup = request.status === "Entregue" && request.pickedUpBy ? ` Retirado por: ${request.pickedUpBy}.` : "";
  return `${signature}Olá, sua solicitação ${request.code} (${request.documentDescription}) está com status "${request.status}".${pickup}`;
}

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
  compact?: boolean;
  onSelect?: (id: string) => void;
  expandedId?: string;
  onToggleExpand?: (id: string) => void;
  renderExpanded?: (request: CopyRequest) => ReactNode;
  renderStatusAction?: (request: CopyRequest) => ReactNode;
  onEdit?: (request: CopyRequest) => void;
  onDelete?: (request: CopyRequest) => void;
}) {
  const showActions = !props.compact && Boolean(props.onEdit || props.onDelete);
  const showExpand = !props.compact && Boolean(props.onToggleExpand && props.renderExpanded);
  const showStatusAction = !props.compact && Boolean(props.renderStatusAction);
  const showFaces = Boolean(props.compact);
  const columnCount =
    (showExpand ? 1 : 0) +
    1 +
    (!props.compact ? 1 : 0) +
    (!props.compact ? 1 : 0) +
    (!props.compact ? 1 : 0) +
    1 +
    1 +
    (showStatusAction ? 1 : 0) +
    (!props.compact ? 1 : 0) +
    (showFaces ? 1 : 0) +
    (showActions ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {showExpand && <th className="border-b border-border px-2.5 py-2.5 print:hidden" aria-label="Expandir" />}
            <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Código</th>
            {!props.compact && <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Responsável</th>}
            {!props.compact && <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Local</th>}
            {!props.compact && <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Solicitante</th>}
            <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Documento</th>
            <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Status</th>
            {showStatusAction && <th className="border-b border-border px-2.5 py-2.5 print:hidden" aria-label="Alterar status" />}
            {!props.compact && <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Prazo</th>}
            {showFaces && <th className="border-b border-border px-2.5 py-2.5 text-left text-xs uppercase text-muted">Faces</th>}
            {showActions && <th className="border-b border-border px-2.5 py-2.5 print:hidden" aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {props.requests.map((request) => {
            const isExpanded = showExpand && props.expandedId === request.id;
            const handleRowClick = showExpand
              ? () => props.onToggleExpand?.(request.id)
              : props.onSelect
                ? () => props.onSelect?.(request.id)
                : undefined;
            return (
              <Fragment key={request.id}>
                <tr
                  className={cn(
                    "border-l-4",
                    request.priority === "Urgente"
                      ? "border-l-priority-urgente-fg"
                      : request.priority === "Institucional"
                        ? "border-l-priority-institucional-fg"
                        : "border-l-transparent",
                    handleRowClick && "cursor-pointer hover:bg-surface-hover",
                    isExpanded && "bg-surface-hover",
                  )}
                  onClick={handleRowClick}
                >
                  {showExpand && (
                    <td className="border-b border-border-soft px-2.5 py-2.5 print:hidden">
                      <button
                        type="button"
                        aria-label={isExpanded ? `Ocultar detalhes de ${request.code}` : `Ver detalhes de ${request.code}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          props.onToggleExpand?.(request.id);
                        }}
                        className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
                      >
                        <ChevronDown size={15} className={cn("transition-transform", !isExpanded && "-rotate-90")} />
                      </button>
                    </td>
                  )}
                  <td className="border-b border-border-soft px-2.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <strong>{request.code}</strong>
                      {request.priority !== "Normal" && (
                        <Badge variant={request.priority === "Urgente" ? "urgente" : "institucional"}>{request.priority}</Badge>
                      )}
                    </div>
                  </td>
                  {!props.compact && <td className="border-b border-border-soft px-2.5 py-2.5">{request.productionOwner}</td>}
                  {!props.compact && <td className="border-b border-border-soft px-2.5 py-2.5">{request.unitName}</td>}
                  {!props.compact && <td className="border-b border-border-soft px-2.5 py-2.5">{request.requester}</td>}
                  <td className="border-b border-border-soft px-2.5 py-2.5">{request.documentDescription}</td>
                  <td className="border-b border-border-soft px-2.5 py-2.5"><Badge variant={statusVariant(request.status)}>{request.status}</Badge></td>
                  {showStatusAction && (
                    <td className="border-b border-border-soft px-2.5 py-2.5 print:hidden" onClick={(event) => event.stopPropagation()}>
                      {props.renderStatusAction?.(request)}
                    </td>
                  )}
                  {!props.compact && <td className="border-b border-border-soft px-2.5 py-2.5">{formatDate(request.desiredDeadline)}</td>}
                  {showFaces && <td className="border-b border-border-soft px-2.5 py-2.5">{formatNumber(request.printedFaces)}</td>}
                  {showActions && (
                    <td className="border-b border-border-soft px-2.5 py-2.5 print:hidden" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {request.contact && (
                          <WhatsAppLink
                            phone={request.contact}
                            label={request.requester}
                            message={buildStatusWhatsAppMessage(request)}
                          />
                        )}
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
                {isExpanded && props.renderExpanded && (
                  <tr>
                    <td colSpan={columnCount} className="border-b border-border-soft bg-surface-soft/60 px-5 py-4">
                      {props.renderExpanded(request)}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FieldError(props: { message?: string }) {
  return <p className="m-0 min-h-[17px] font-bold text-[#a43b2f]">{props.message}</p>;
}

function RequestForm(props: {
  units: Unit[];
  people: Person[];
  users: User[];
  editingRequest: CopyRequest | undefined;
  canManageUnits: boolean;
  currentUserName: string;
  onSubmit: (values: RequestDraft) => Promise<void>;
  onCancel: () => void;
  onCreateUnit: (draft: { name: string; origin: Origin; contact?: string }) => Promise<Unit>;
  onCreatePerson: (draft: { name: string; registrationNumber: string; phone: string; unitId: string }) => Promise<Person>;
}) {
  const { units, people, users, editingRequest, canManageUnits, currentUserName, onSubmit, onCancel, onCreateUnit, onCreatePerson } = props;
  const activeUsers = users.filter((account) => account.active);
  const unitSearchInputRef = useRef<HTMLInputElement>(null);
  const personSearchInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RequestDraft>({
    resolver: zodResolver(requestDraftSchema),
    defaultValues: editingRequest
      ? {
          ...requestToDraft(editingRequest),
          personId:
            people.find(
              (person) =>
                person.unitId === editingRequest.unitId &&
                person.name.toLocaleLowerCase("pt-BR") === editingRequest.requester.toLocaleLowerCase("pt-BR"),
            )?.id ?? "",
        }
      : {
          ...emptyDraft,
          unitId: units.find((unit) => unit.origin === "ESCOLA")?.id ?? "",
          // Quem está criando a solicitação normalmente é quem vai produzi-la
          // — evita ter que escolher o próprio nome na lista toda vez.
          productionOwner: currentUserName,
        },
  });

  const [origin, unitId, personId, pages, copies, duplex, productionOwner] = watch([
    "origin",
    "unitId",
    "personId",
    "pages",
    "copies",
    "duplex",
    "productionOwner",
  ]);
  const totals = calculatePrintTotals({ pages: Number(pages) || 0, copies: Number(copies) || 0, duplex });
  const availableUnits = units.filter((unit) => unit.origin === origin && unit.active);
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  const filteredUnits = availableUnits.filter((unit) =>
    unit.name.toLowerCase().includes(unitSearchQuery.trim().toLowerCase()),
  );
  const [isUnitSelectOpen, setIsUnitSelectOpen] = useState(false);

  const availablePeople = people.filter((person) => person.unitId === unitId && person.active);
  const [personSearchQuery, setPersonSearchQuery] = useState("");
  const filteredPeople = availablePeople.filter((person) =>
    person.name.toLowerCase().includes(personSearchQuery.trim().toLowerCase()),
  );
  const [isPersonSelectOpen, setIsPersonSelectOpen] = useState(false);

  function selectPerson(person: Person) {
    setValue("personId", person.id, { shouldValidate: true });
    setValue("requester", person.name, { shouldValidate: true });
    setValue("registrationNumber", person.registrationNumber);
    setValue("contact", person.phone);
  }

  function resetPerson() {
    setValue("personId", "", { shouldValidate: true });
    setValue("requester", "");
    setValue("registrationNumber", "");
    setValue("contact", "");
  }
  const [isCreateUnitDialogOpen, setIsCreateUnitDialogOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitContact, setNewUnitContact] = useState("");
  const [newUnitError, setNewUnitError] = useState("");
  const [isCreatingUnit, setIsCreatingUnit] = useState(false);

  function openCreateUnitDialog() {
    setIsUnitSelectOpen(false);
    setNewUnitName(unitSearchQuery.trim());
    setNewUnitContact("");
    setNewUnitError("");
    setIsCreateUnitDialogOpen(true);
  }

  async function handleCreateUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newUnitName.trim();
    if (!name) {
      setNewUnitError("Informe o nome do local.");
      return;
    }
    setIsCreatingUnit(true);
    setNewUnitError("");
    try {
      const created = await onCreateUnit({ name, origin, contact: newUnitContact.trim() || undefined });
      setValue("unitId", created.id, { shouldValidate: true });
      setIsCreateUnitDialogOpen(false);
      setUnitSearchQuery("");
    } catch (error) {
      setNewUnitError(error instanceof Error ? error.message : "Não foi possível cadastrar o local.");
    } finally {
      setIsCreatingUnit(false);
    }
  }

  const [isCreatePersonDialogOpen, setIsCreatePersonDialogOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRegistrationNumber, setNewPersonRegistrationNumber] = useState("");
  const [newPersonPhone, setNewPersonPhone] = useState("");
  const [newPersonError, setNewPersonError] = useState("");
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);

  function openCreatePersonDialog() {
    setIsPersonSelectOpen(false);
    setNewPersonName(personSearchQuery.trim());
    setNewPersonRegistrationNumber("");
    setNewPersonPhone("");
    setNewPersonError("");
    setIsCreatePersonDialogOpen(true);
  }

  async function handleCreatePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newPersonName.trim();
    if (!name) {
      setNewPersonError("Informe o nome da pessoa.");
      return;
    }
    if (!unitId) {
      setNewPersonError("Selecione o local antes de cadastrar a pessoa.");
      return;
    }
    setIsCreatingPerson(true);
    setNewPersonError("");
    try {
      const created = await onCreatePerson({
        name,
        registrationNumber: newPersonRegistrationNumber.trim(),
        phone: newPersonPhone.trim(),
        unitId,
      });
      selectPerson(created);
      setIsCreatePersonDialogOpen(false);
      setPersonSearchQuery("");
    } catch (error) {
      setNewPersonError(error instanceof Error ? error.message : "Não foi possível cadastrar a pessoa.");
    } finally {
      setIsCreatingPerson(false);
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 rounded-lg border border-border bg-surface p-[18px] shadow-none">
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
      <div className="mb-2.5">
        <p className="m-0 mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Local e solicitante</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        {editingRequest && (
          <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
            Código
            <input
              className="h-11 w-full cursor-not-allowed rounded border border-border bg-surface px-3 text-sm text-muted focus-visible:outline-none"
              value={editingRequest.code}
              readOnly
              disabled
            />
            <FieldError />
          </label>
        )}
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Origem
          <Select
            value={origin}
            onValueChange={(nextOrigin) => {
              setValue("origin", nextOrigin as Origin, { shouldValidate: true });
              setValue("unitId", units.find((unit) => unit.origin === nextOrigin)?.id ?? "", { shouldValidate: true });
              resetPerson();
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {origins.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldError />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Local
          <div className="flex min-w-0 items-center gap-2">
            <Select
              value={watch("unitId")}
              onValueChange={(value) => {
                setValue("unitId", value, { shouldValidate: true });
                resetPerson();
              }}
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
              <SelectTrigger className="min-w-0 flex-1"><SelectValue /></SelectTrigger>
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
                      className="h-9 w-full rounded border border-border bg-surface pl-8 pr-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
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
            {canManageUnits && (
              <button
                type="button"
                onClick={openCreateUnitDialog}
                aria-label="Cadastrar novo local"
                title="Cadastrar novo local"
                className="grid h-11 w-11 shrink-0 place-items-center rounded border border-border bg-surface text-muted [appearance:none] hover:border-accent hover:text-accent shadow-none [appearance:none] focus:border-accent focus:outline-none"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          <FieldError message={errors.unitId?.message} />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label sm:col-span-2">
          Pessoa
          <div className="flex min-w-0 items-center gap-2">
            <Select
              value={personId}
              onValueChange={(value) => {
                const person = people.find((item) => item.id === value);
                if (person) selectPerson(person);
              }}
              open={isPersonSelectOpen}
              onOpenChange={(open) => {
                setIsPersonSelectOpen(open);
                if (open) {
                  window.setTimeout(() => personSearchInputRef.current?.focus(), 0);
                } else {
                  setPersonSearchQuery("");
                }
              }}
            >
              <SelectTrigger className="min-w-0 flex-1">
                <SelectValue placeholder={unitId ? "Selecione…" : "Selecione o local primeiro"} />
              </SelectTrigger>
              <SelectContent>
                <div className="sticky -top-1 z-10 -mx-1 -mt-1 mb-1 border-b border-border bg-surface p-1.5">
                  <div className="relative">
                    <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      ref={personSearchInputRef}
                      value={personSearchQuery}
                      onChange={(event) => setPersonSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.preventDefault();
                        if (event.key !== "Escape") event.stopPropagation();
                      }}
                      placeholder="Pesquisar pessoa..."
                      className="h-9 w-full rounded border border-border bg-surface pl-8 pr-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
                {filteredPeople.length === 0 ? (
                  <p className="m-0 px-3 py-2 text-sm text-muted">Nenhuma pessoa encontrada.</p>
                ) : (
                  filteredPeople.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}{person.phone ? ` — ${person.phone}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {canManageUnits && (
              <button
                type="button"
                onClick={openCreatePersonDialog}
                disabled={!unitId}
                aria-label="Cadastrar nova pessoa"
                title="Cadastrar nova pessoa"
                className="grid h-11 w-11 shrink-0 place-items-center rounded border border-border bg-surface text-muted [appearance:none] hover:border-accent hover:text-accent shadow-none [appearance:none] focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          <FieldError message={errors.personId?.message} />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label sm:col-span-2 lg:col-span-4">
          Descrição / documento
          <Input {...register("documentDescription")} />
          <FieldError message={errors.documentDescription?.message} />
        </label>
        </div>
      </div>

      <div className="mb-2.5">
        <p className="m-0 mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Especificações de impressão</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Layout
          <Select value={watch("layout")} onValueChange={(value) => setValue("layout", value as RequestDraft["layout"], { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{layouts.map((layout) => <SelectItem key={layout} value={layout}>{layout}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Páginas
          <Input
            type="number"
            min={1}
            {...register("pages", { valueAsNumber: true })}
          />
          <FieldError message={errors.pages?.message} />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Jogos / cópias
          <Input
            type="number"
            min={1}
            {...register("copies", { valueAsNumber: true })}
          />
          <FieldError message={errors.copies?.message} />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Papel
          <Select value={watch("paper")} onValueChange={(value) => setValue("paper", value as RequestDraft["paper"], { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{papers.map((paper) => <SelectItem key={paper} value={paper}>{paper}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Cor
          <Select value={watch("colorMode")} onValueChange={(value) => setValue("colorMode", value as RequestDraft["colorMode"], { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{colors.map((color) => <SelectItem key={color} value={color}>{color}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Imprimir
          <Select
            value={duplex ? "Frente e verso" : "Frente"}
            onValueChange={(value) => setValue("duplex", value === "Frente e verso", { shouldValidate: true })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Frente">Frente</SelectItem>
              <SelectItem value="Frente e verso">Frente e verso</SelectItem>
            </SelectContent>
          </Select>
          <FieldError />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Grampo
          <Select value={watch("staple")} onValueChange={(value) => setValue("staple", value as RequestDraft["staple"], { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{staples.map((staple) => <SelectItem key={staple} value={staple}>{staple}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError />
        </label>
        </div>
      </div>

      <div className="mb-2.5">
        <p className="m-0 mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Agendamento e responsável</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Prioridade
          <Select value={watch("priority")} onValueChange={(value) => setValue("priority", value as RequestDraft["priority"], { shouldValidate: true })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{priorities.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Prazo desejado
          <input
            type="date"
            className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
            {...register("desiredDeadline")}
          />
          <FieldError message={errors.desiredDeadline?.message} />
        </label>
        <label className="grid min-w-0 gap-1.5 text-sm font-bold text-label">
          Responsável
          <Select value={watch("productionOwner")} onValueChange={(value) => setValue("productionOwner", value, { shouldValidate: true })}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              {/* Conta hoje inativa/removida ainda aparece se já era a responsável, pra não sumir com o dado salvo. */}
              {productionOwner && !activeUsers.some((account) => account.name === productionOwner) && (
                <SelectItem value={productionOwner}>{productionOwner}</SelectItem>
              )}
              {activeUsers.map((account) => <SelectItem key={account.id} value={account.name}>{account.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldError />
        </label>
        </div>
      </div>

      <div>
        <p className="m-0 mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Observações</p>
        <textarea
          className="min-h-[82px] w-full resize-y rounded border border-border bg-surface px-3 py-2 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
          {...register("notes")}
        />
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
      <Dialog open={isCreateUnitDialogOpen} onOpenChange={setIsCreateUnitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar novo local</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUnit} className="grid gap-1.5">
            <label className="grid gap-1.5 text-sm font-bold text-label">
              Origem
              <input
                className="h-11 w-full cursor-not-allowed rounded border border-border bg-surface px-3 text-sm text-muted focus-visible:outline-none"
                value={origin}
                readOnly
                disabled
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-label">
              Nome
              <input
                autoFocus
                value={newUnitName}
                onChange={(event) => setNewUnitName(event.target.value)}
                className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-label">
              Contato
              <input
                value={newUnitContact}
                onChange={(event) => setNewUnitContact(event.target.value)}
                className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
              />
            </label>
            {newUnitError && <p className="m-0 font-bold text-[#a43b2f]">{newUnitError}</p>}
            <DialogFooter>
              <Button type="button" variant="soft" onClick={() => setIsCreateUnitDialogOpen(false)} disabled={isCreatingUnit}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatingUnit}>
                {isCreatingUnit ? <Spinner /> : <Plus size={16} />}
                {isCreatingUnit ? "Salvando…" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isCreatePersonDialogOpen} onOpenChange={setIsCreatePersonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar nova pessoa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePerson} className="grid gap-1.5">
            <label className="grid gap-1.5 text-sm font-bold text-label">
              Local
              <input
                className="h-11 w-full cursor-not-allowed rounded border border-border bg-surface px-3 text-sm text-muted focus-visible:outline-none"
                value={units.find((unit) => unit.id === unitId)?.name ?? ""}
                readOnly
                disabled
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-label">
              Nome
              <input
                autoFocus
                value={newPersonName}
                onChange={(event) => setNewPersonName(event.target.value)}
                className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-label">
              Matrícula
              <input
                value={newPersonRegistrationNumber}
                onChange={(event) => setNewPersonRegistrationNumber(event.target.value)}
                className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-label">
              Celular
              <input
                value={newPersonPhone}
                onChange={(event) => setNewPersonPhone(formatPhone(event.target.value))}
                placeholder="(00) 00000-0000"
                className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
              />
            </label>
            {newPersonError && <p className="m-0 font-bold text-[#a43b2f]">{newPersonError}</p>}
            <DialogFooter>
              <Button type="button" variant="soft" onClick={() => setIsCreatePersonDialogOpen(false)} disabled={isCreatingPerson}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatingPerson}>
                {isCreatingPerson ? <Spinner /> : <Plus size={16} />}
                {isCreatingPerson ? "Salvando…" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeliveryConfirmationScreen(props: {
  request: CopyRequest;
  pickedUpBy: string;
  onPickedUpByChange: (value: string) => void;
  error: string;
  isConfirming: boolean;
  signatureRef: RefObject<SignaturePadHandle | null>;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { request, pickedUpBy, onPickedUpByChange, error, isConfirming, signatureRef, onCancel, onConfirm } = props;
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Voltar para a lista"
          className="grid h-8 w-8 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="m-0 text-[1.08rem] font-bold text-text">Confirmar entrega</h2>
          <p className="m-0 text-sm text-muted">Solicitação {request.code}</p>
        </div>
      </div>

      <Card>
        <p className="m-0 mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">Resumo da solicitação</p>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {(
            [
              ["Local", request.unitName],
              ["Solicitante", request.requester],
              ["Documento", request.documentDescription],
              ["Páginas", formatNumber(request.pages)],
              ["Jogos / cópias", formatNumber(request.copies)],
              ["Papel", request.paper],
              ["Cor", request.colorMode],
              ["Imprimir", request.duplex ? "Frente e verso" : "Frente"],
              ["Grampo", request.staple],
              ["Prioridade", request.priority],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <p className="m-0 text-xs font-bold uppercase text-muted">{label}</p>
              <p className="m-0 font-bold text-text">{value}</p>
            </div>
          ))}
          {request.notes && (
            <div className="max-w-sm">
              <p className="m-0 text-xs font-bold uppercase text-muted">Observações</p>
              <p className="m-0 font-bold text-text">{request.notes}</p>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm();
          }}
          className="grid gap-3"
        >
          <label className="grid max-w-md gap-1.5 text-sm font-bold text-label">
            Quem retirou as cópias
            <input
              autoFocus
              value={pickedUpBy}
              onChange={(event) => onPickedUpByChange(event.target.value)}
              placeholder="Nome de quem retirou"
              className="h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
            />
          </label>
          <div className="grid max-w-md gap-1.5 text-sm font-bold text-label">
            {/* div, não label: um <label> envolvendo o pad encaminha o
                clique de soltar o mouse no canvas pro botão "Limpar
                assinatura" (único controle associável ali dentro), que é
                o primeiro elemento associável — limpando o traço recém
                desenhado assim que o usuário solta o mouse. */}
            Assinatura de quem retirou
            <SignaturePad ref={signatureRef} className="max-w-md" />
          </div>
          {error && <p className="m-0 font-bold text-[#a43b2f]">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="soft" onClick={onCancel} disabled={isConfirming}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isConfirming}>
              {isConfirming ? <Spinner /> : <Check size={16} />}
              {isConfirming ? "Confirmando…" : "Confirmar entrega"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

const filterSelectClasses = "h-11 w-full rounded border border-border bg-surface px-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none";

export function RequestsView(props: {
  units: Unit[];
  people: Person[];
  users: User[];
  filteredRequests: CopyRequest[];
  selectedRequest: CopyRequest | undefined;
  onSelectRequest: (id: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: RequestStatus | "Todos";
  onStatusFilterChange: (value: RequestStatus | "Todos") => void;
  originFilter: Origin | "Todas";
  onOriginFilterChange: (value: Origin | "Todas") => void;
  mode: "list" | "form";
  editingRequest: CopyRequest | undefined;
  canEdit: boolean;
  canCreate: boolean;
  canUpdateProduction: boolean;
  canManageUnits: boolean;
  currentUserName: string;
  onStartCreate: () => void;
  onSubmit: (values: RequestDraft) => Promise<void>;
  onEditRequest: (request: CopyRequest) => void;
  onCancelEdit: () => void;
  onDeleteRequest: (request: CopyRequest) => Promise<void>;
  onStatusChange: (request: CopyRequest, status: RequestStatus, pickedUpBy?: string, signature?: string) => Promise<void>;
  onDeleteHistoryEntry: (requestId: string, entryId: number) => Promise<void>;
  onCreateUnit: (draft: { name: string; origin: Origin; contact?: string }) => Promise<Unit>;
  onCreatePerson: (draft: { name: string; registrationNumber: string; phone: string; unitId: string }) => Promise<Person>;
}) {
  const {
    units,
    people,
    users,
    filteredRequests,
    selectedRequest,
    onSelectRequest,
    query,
    onQueryChange,
    statusFilter,
    onStatusFilterChange,
    originFilter,
    onOriginFilterChange,
    mode,
    editingRequest,
    canEdit,
    canCreate,
    canUpdateProduction,
    canManageUnits,
    currentUserName,
    onStartCreate,
    onSubmit,
    onEditRequest,
    onCancelEdit,
    onDeleteRequest,
    onStatusChange,
    onDeleteHistoryEntry,
    onCreateUnit,
    onCreatePerson,
  } = props;

  const [pendingDelete, setPendingDelete] = useState<CopyRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusChangingTo, setStatusChangingTo] = useState<RequestStatus | null>(null);
  const [pendingDeleteHistoryEntry, setPendingDeleteHistoryEntry] = useState<{ requestId: string; entryId: number; status: string } | null>(null);
  const [isDeletingHistoryEntry, setIsDeletingHistoryEntry] = useState(false);
  const [pendingDelivery, setPendingDelivery] = useState<CopyRequest | null>(null);
  const [deliveryPickedUpBy, setDeliveryPickedUpBy] = useState("");
  const [deliveryError, setDeliveryError] = useState("");
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const deliverySignatureRef = useRef<SignaturePadHandle>(null);

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

  async function handleStatusClick(request: CopyRequest, status: RequestStatus, pickedUpBy?: string, signature?: string) {
    setStatusChangingTo(status);
    try {
      await onStatusChange(request, status, pickedUpBy, signature);
    } finally {
      setStatusChangingTo(null);
    }
  }

  function requestStatusChange(request: CopyRequest, status: RequestStatus) {
    if (status === "Entregue") {
      setPendingDelivery(request);
      setDeliveryPickedUpBy(request.pickedUpBy);
      setDeliveryError("");
      deliverySignatureRef.current?.clear();
      return;
    }
    void handleStatusClick(request, status);
  }

  async function handleConfirmDelivery() {
    if (!pendingDelivery) return;
    const name = deliveryPickedUpBy.trim();
    if (!name) {
      setDeliveryError("Informe quem retirou as cópias.");
      return;
    }
    if (deliverySignatureRef.current?.isEmpty()) {
      setDeliveryError("Colete a assinatura de quem retirou.");
      return;
    }
    const signature = deliverySignatureRef.current?.toDataUrl() ?? "";
    setIsConfirmingDelivery(true);
    try {
      await handleStatusClick(pendingDelivery, "Entregue", name, signature);
      setPendingDelivery(null);
    } finally {
      setIsConfirmingDelivery(false);
    }
  }

  async function handleConfirmDeleteHistoryEntry() {
    if (!pendingDeleteHistoryEntry) return;
    setIsDeletingHistoryEntry(true);
    try {
      await onDeleteHistoryEntry(pendingDeleteHistoryEntry.requestId, pendingDeleteHistoryEntry.entryId);
      setPendingDeleteHistoryEntry(null);
    } finally {
      setIsDeletingHistoryEntry(false);
    }
  }

  function renderStatusAction(request: CopyRequest) {
    if (!canUpdateProduction) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={statusChangingTo !== null}
            aria-label={`Alterar status de ${request.code}`}
            className="grid h-7 w-7 place-items-center rounded border-0 bg-transparent p-0 text-muted [appearance:none] hover:bg-surface-soft hover:text-text disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCw size={15} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {statuses.map((status) => {
            const alreadyDone = request.history.some((entry) => entry.status === status);
            const selectable = isStatusSelectable(request.history, status);
            return (
              <DropdownMenuItem
                key={status}
                disabled={!selectable}
                onSelect={() => selectable && requestStatusChange(request, status)}
              >
                {alreadyDone && <Check size={15} className="text-accent-strong" />}
                {status}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function renderExpandedRow(request: CopyRequest) {
    return (
      <div className="grid gap-4">
        <div>
          <h3 className="m-0 mb-2 text-center text-sm font-bold uppercase text-muted">Dados de impressão</h3>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {(
              [
                ["Páginas", formatNumber(request.pages)],
                ["Jogos / cópias", formatNumber(request.copies)],
                ["Papel", request.paper],
                ["Cor", request.colorMode],
                ["Prioridade", request.priority],
                ["Imprimir", request.duplex ? "Frente e verso" : "Frente"],
                ["Grampo", request.staple],
                ["Layout", request.layout],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <p className="m-0 text-xs font-bold uppercase text-muted">{label}</p>
                <p className="m-0 font-bold text-text">{value}</p>
              </div>
            ))}
            {request.notes && (
              <div className="max-w-sm">
                <p className="m-0 text-xs font-bold uppercase text-muted">Observações</p>
                <p className="m-0 font-bold text-text">{request.notes}</p>
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="m-0 mb-2 text-center text-sm font-bold uppercase text-muted">Histórico</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {statuses.map((status) => {
              const entry = request.history.find((item) => item.status === status);
              const selectable = isStatusSelectable(request.history, status);
              return (
                <div key={status} className="flex flex-col items-center gap-1 rounded border border-border-soft bg-surface p-2.5 text-center">
                  <p className={cn("m-0 text-xs font-bold uppercase", entry ? "text-accent-strong" : "text-muted")}>{status}</p>
                  {entry ? (
                    <>
                      <p className="m-0 text-sm font-bold text-text">{formatDate(entry.date)}</p>
                      <p className="m-0 text-xs text-muted">{entry.by}</p>
                    </>
                  ) : (
                    <p className="m-0 text-sm text-muted">—</p>
                  )}
                  {canUpdateProduction && (
                    <div className="print:hidden">
                      {entry ? (
                        <button
                          type="button"
                          disabled={request.history.length <= 1}
                          title={request.history.length <= 1 ? "É preciso manter ao menos uma entrada no histórico." : undefined}
                          aria-label={`Excluir fase "${entry.status}" do histórico`}
                          onClick={() => setPendingDeleteHistoryEntry({ requestId: request.id, entryId: entry.id, status: entry.status })}
                          className="mt-1 grid h-6 w-6 place-items-center rounded border-0 bg-transparent p-0 text-[#9b3d35] [appearance:none] hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!selectable || statusChangingTo !== null}
                          aria-label={`Registrar fase "${status}"`}
                          onClick={() => requestStatusChange(request, status)}
                          className="mt-1 grid h-6 w-6 place-items-center rounded border-0 bg-transparent p-0 text-accent-strong [appearance:none] hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-30"
                        >
                          <Plus size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {request.status === "Entregue" && request.signature && (
          <div>
            <h3 className="m-0 mb-2 text-center text-sm font-bold uppercase text-muted">
              {request.pickedUpBy ? `Assinado por: ${request.pickedUpBy}` : "Assinatura de quem retirou"}
            </h3>
            <div className="mx-auto h-28 w-64 rounded border border-border-soft bg-white p-1.5">
              <img src={request.signature} alt={`Assinatura de ${request.pickedUpBy}`} className="h-full w-full object-contain" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === "form") {
    return (
      <RequestForm
        key={editingRequest?.id ?? "new"}
        units={units}
        people={people}
        users={users}
        editingRequest={editingRequest}
        canManageUnits={canManageUnits}
        currentUserName={currentUserName}
        onSubmit={onSubmit}
        onCancel={onCancelEdit}
        onCreateUnit={onCreateUnit}
        onCreatePerson={onCreatePerson}
      />
    );
  }

  if (pendingDelivery) {
    return (
      <DeliveryConfirmationScreen
        request={pendingDelivery}
        pickedUpBy={deliveryPickedUpBy}
        onPickedUpByChange={(value) => {
          setDeliveryPickedUpBy(value);
          if (deliveryError) setDeliveryError("");
        }}
        error={deliveryError}
        isConfirming={isConfirmingDelivery}
        signatureRef={deliverySignatureRef}
        onCancel={() => setPendingDelivery(null)}
        onConfirm={() => void handleConfirmDelivery()}
      />
    );
  }

  const filterSummary = [
    `${filteredRequests.length} solicitação(ões)`,
    statusFilter !== "Todos" ? `status: ${statusFilter}` : null,
    originFilter !== "Todas" ? `origem: ${originFilter}` : null,
    query.trim() ? `busca: "${query.trim()}"` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <>
      <PrintReportHeader title="Relatório de Solicitações" subtitle={filterSummary} />
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <Card>
        <div className="mb-3.5 grid grid-cols-1 items-end gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_160px_160px_190px] print:hidden">
          <label className="relative block">
            <Search size={17} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar por código, unidade, solicitante ou documento"
              className="h-11 w-full rounded border border-border bg-surface pl-9 pr-3 text-sm text-text shadow-none [appearance:none] focus:border-accent focus:outline-none"
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
          {canCreate && (
            <Button type="button" onClick={onStartCreate} className="self-end sm:col-span-2 lg:col-span-1">
              <Plus size={17} />
              Nova solicitação
            </Button>
          )}
        </div>
        <RequestTable
          requests={filteredRequests}
          expandedId={selectedRequest?.id}
          onToggleExpand={(id) => onSelectRequest(selectedRequest?.id === id ? "" : id)}
          renderExpanded={renderExpandedRow}
          renderStatusAction={renderStatusAction}
          onEdit={canEdit ? onEditRequest : undefined}
          onDelete={canEdit ? (request) => setPendingDelete(request) : undefined}
        />
      </Card>

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

      <ConfirmModal
        open={pendingDeleteHistoryEntry !== null}
        title="Excluir entrada do histórico"
        description={
          pendingDeleteHistoryEntry
            ? `Tem certeza que deseja excluir a entrada "${pendingDeleteHistoryEntry.status}" do histórico? Essa ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir"
        danger
        isConfirming={isDeletingHistoryEntry}
        onConfirm={handleConfirmDeleteHistoryEntry}
        onCancel={() => setPendingDeleteHistoryEntry(null)}
      />
    </>
  );
}
