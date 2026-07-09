"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import { Archive, CalendarDays, GripVertical, Home, Mail, Phone, UsersRound } from "lucide-react";

import { csrfFieldName } from "@/lib/csrf-fields";
import type { Lead, LeadPriority, LeadStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export type InquiryBoardColumn = {
  id: LeadStatus;
  label: string;
  accent: string;
  bg: string;
};

export type InquiryBoardItem = Lead & {
  code: string;
  hostName: string;
  propertyLabel: string;
};

type InquiryKanbanBoardProps = {
  archiveAction: (formData: FormData) => void | Promise<void>;
  columns: InquiryBoardColumn[];
  csrfToken: string;
  currentLeadPath: string;
  currentMonth: string;
  isAdmin: boolean;
  leads: InquiryBoardItem[];
  leadSearch: string;
  moveAction: (formData: FormData) => void | Promise<void>;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function compactDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value || "Date unavailable";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(date);
}

function leadDateRange(lead: Pick<Lead, "checkIn" | "checkOut">) {
  if (lead.checkIn && lead.checkOut) return `${compactDate(lead.checkIn)} - ${compactDate(lead.checkOut)}`;
  if (lead.checkIn) return `From ${compactDate(lead.checkIn)}`;
  if (lead.checkOut) return `Until ${compactDate(lead.checkOut)}`;
  return "Dates not set";
}

function leadPriorityLabel(priority: LeadPriority) {
  if (priority === "urgent") return "Urgent";
  if (priority === "high") return "High";
  if (priority === "low") return "Low";
  return "Normal";
}

function leadPriorityTone(priority: LeadPriority) {
  if (priority === "urgent") return "bg-rose-100 text-rose-700";
  if (priority === "high") return "bg-amber-100 text-amber-700";
  if (priority === "low") return "bg-sky-100 text-sky-700";
  return "bg-zinc-100 text-zinc-700";
}

function isInteractiveDragTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("a, button, input, select, textarea"));
}

function LeadContactDetails({ lead }: { lead: Pick<Lead, "contactEmail" | "contactPhone"> }) {
  if (!lead.contactPhone && !lead.contactEmail) {
    return <p className="rounded-xl bg-black/[0.03] px-3 py-2 text-sm text-black/55">No contact details</p>;
  }

  return (
    <div className="grid gap-2 text-sm">
      {lead.contactPhone ? (
        <div className="flex min-w-0 items-start gap-2 text-black/70">
          <Phone className="mt-0.5 size-4 shrink-0 text-black/35" aria-hidden="true" />
          <span className="min-w-0 break-words">{lead.contactPhone}</span>
        </div>
      ) : null}
      {lead.contactEmail ? (
        <div className="flex min-w-0 items-start gap-2 text-black/70">
          <Mail className="mt-0.5 size-4 shrink-0 text-black/35" aria-hidden="true" />
          <span className="min-w-0 break-all">{lead.contactEmail}</span>
        </div>
      ) : null}
    </div>
  );
}

export function InquiryKanbanBoard({
  archiveAction,
  columns,
  csrfToken,
  currentLeadPath,
  currentMonth,
  isAdmin,
  leads,
  leadSearch,
  moveAction,
}: InquiryKanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<LeadStatus | null>(null);
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  const moveFormRef = useRef<HTMLFormElement>(null);
  const moveIdRef = useRef<HTMLInputElement>(null);
  const moveStatusRef = useRef<HTMLInputElement>(null);
  const queryBase = { month: currentMonth, q: leadSearch || undefined };

  function submitMove(leadId: string, status: LeadStatus) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.status === status || !moveFormRef.current || !moveIdRef.current || !moveStatusRef.current) return;

    moveIdRef.current.value = lead.id;
    moveStatusRef.current.value = status;
    setPendingLeadId(lead.id);
    moveFormRef.current.requestSubmit();
  }

  function handleDragStart(event: DragEvent<HTMLElement>, lead: InquiryBoardItem) {
    if (isInteractiveDragTarget(event.target)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", lead.id);
    event.dataTransfer.setData("application/x-stayprime-inquiry", lead.id);
    setDraggedLeadId(lead.id);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, status: LeadStatus) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dropTarget !== status) setDropTarget(status);
  }

  function handleDrop(event: DragEvent<HTMLElement>, status: LeadStatus) {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("application/x-stayprime-inquiry") || event.dataTransfer.getData("text/plain") || draggedLeadId;
    setDraggedLeadId(null);
    setDropTarget(null);
    if (leadId) submitMove(leadId, status);
  }

  return (
    <div className="grid auto-cols-[minmax(20rem,22rem)] grid-flow-col gap-4 overflow-x-auto overscroll-x-contain p-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:p-5 [&::-webkit-scrollbar]:hidden">
      <form ref={moveFormRef} action={moveAction} className="hidden">
        <input type="hidden" name={csrfFieldName} value={csrfToken} />
        <input ref={moveIdRef} type="hidden" name="id" />
        <input ref={moveStatusRef} type="hidden" name="status" />
        <input type="hidden" name="returnTo" value={currentLeadPath} />
      </form>

      {columns.map((column) => {
        const columnLeads = leads.filter((lead) => lead.status === column.id);
        const isDropTarget = dropTarget === column.id;

        return (
          <section
            key={column.id}
            id={`lead-column-${column.id}`}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
            }}
            onDragOver={(event) => handleDragOver(event, column.id)}
            onDrop={(event) => handleDrop(event, column.id)}
            className={`min-h-[28rem] rounded-[1.25rem] border bg-[#fbfaf8] p-3 transition ${
              isDropTarget ? "border-[#2563eb] ring-4 ring-[#2563eb]/15" : "border-black/10"
            }`}
          >
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold" style={{ color: column.accent }}>{column.label}</h3>
                <p className="mt-1 text-xs text-black/45">{columnLeads.length} inquir{columnLeads.length === 1 ? "y" : "ies"}</p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ backgroundColor: column.bg, color: column.accent }}>{columnLeads.length}</span>
            </div>

            <div className="mt-3 grid gap-3">
              {columnLeads.length === 0 ? (
                <div className={`rounded-2xl border border-dashed bg-white p-4 text-sm text-black/50 transition ${isDropTarget ? "border-[#2563eb]/40" : "border-black/10"}`}>
                  No inquiries here yet.
                </div>
              ) : null}

              {columnLeads.map((lead) => {
                const isDragging = draggedLeadId === lead.id;
                const isPending = pendingLeadId === lead.id;

                return (
                  <article
                    key={lead.id}
                    draggable
                    aria-grabbed={isDragging}
                    onDragEnd={() => {
                      setDraggedLeadId(null);
                      setDropTarget(null);
                    }}
                    onDragStart={(event) => handleDragStart(event, lead)}
                    className={`rounded-2xl border border-black/10 bg-white p-4 shadow-[0_8px_20px_rgba(33,23,15,0.05)] transition ${
                      isDragging ? "scale-[0.98] opacity-60 ring-2 ring-[#2563eb]/25" : "cursor-grab active:cursor-grabbing"
                    } ${isPending ? "opacity-70" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/35">{lead.code}</p>
                        <h4 className="mt-1 break-words text-lg font-bold leading-tight text-black">{lead.contactName}</h4>
                        {lead.companyOrGroup ? <p className="mt-1 break-words text-sm font-semibold text-black/55">{lead.companyOrGroup}</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <GripVertical className="size-4 text-black/25" aria-hidden="true" />
                        <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${leadPriorityTone(lead.priority)}`}>{leadPriorityLabel(lead.priority)}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <LeadContactDetails lead={lead} />

                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#fbf7f2] p-3 text-sm">
                        <div className="min-w-0">
                          <p className="text-xs text-black/40">Source</p>
                          <p className="mt-1 truncate font-semibold text-black/75">{lead.source || "Not set"}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-black/40">Estimate</p>
                          <p className="mt-1 break-words font-semibold text-black/75">{lead.estimatedValue ? formatCurrency(lead.estimatedValue) : "Not set"}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-black/40">Guests</p>
                          <p className="mt-1 font-semibold text-black/75">{lead.guests ?? "Not set"}</p>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm text-black/70">
                        <div className="flex min-w-0 items-start gap-2">
                          <Home className="mt-0.5 size-4 shrink-0 text-black/35" aria-hidden="true" />
                          <span className="min-w-0 break-words">{lead.propertyLabel}</span>
                        </div>
                        <div className="flex min-w-0 items-start gap-2">
                          <CalendarDays className="mt-0.5 size-4 shrink-0 text-black/35" aria-hidden="true" />
                          <span className="min-w-0 break-words">{leadDateRange(lead)}</span>
                        </div>
                        {lead.lastContactedAt ? (
                          <div className="flex min-w-0 items-start gap-2">
                            <UsersRound className="mt-0.5 size-4 shrink-0 text-black/35" aria-hidden="true" />
                            <span className="min-w-0 break-words">Last contacted {compactDate(lead.lastContactedAt)}</span>
                          </div>
                        ) : null}
                        {isAdmin ? <p className="break-words text-xs text-black/55"><span className="font-semibold text-black/65">Host:</span> {lead.hostName}</p> : null}
                      </div>

                      {lead.notes ? <p className="line-clamp-3 break-words rounded-xl bg-black/[0.03] px-3 py-2 text-sm text-black/60">{lead.notes}</p> : null}
                    </div>

                    <form action={moveAction} className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-black/10 pt-3">
                      <input type="hidden" name={csrfFieldName} value={csrfToken} />
                      <input type="hidden" name="id" value={lead.id} />
                      <input type="hidden" name="returnTo" value={currentLeadPath} />
                      <select name="status" defaultValue={lead.status} className="min-h-10 min-w-0 rounded-xl border border-black/10 px-3 text-sm font-semibold text-black/70 outline-none focus:border-[#2563eb]" aria-label={`Move ${lead.contactName} to another status`}>
                        {columns.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
                      <button className="min-h-10 rounded-xl bg-[#2563eb] px-3 text-xs font-bold text-white">Move</button>
                    </form>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link href={`/host/erp/leads${buildQuery({ ...queryBase, editLead: lead.id })}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-black/10 text-sm font-bold text-black/70">
                        Edit
                      </Link>
                      <form action={archiveAction}>
                        <input type="hidden" name={csrfFieldName} value={csrfToken} />
                        <input type="hidden" name="id" value={lead.id} />
                        <input type="hidden" name="returnTo" value={currentLeadPath} />
                        <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-bold text-rose-700">
                          <Archive className="size-4" aria-hidden="true" />
                          Archive
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
