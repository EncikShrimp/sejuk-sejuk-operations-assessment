"use client";

import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { formatOrderNumber } from "@/lib/domain/order-number";
import { MAX_EVIDENCE_FILES, evidenceFileLimitMessage } from "@/lib/domain/evidence";
import { fieldMetadataFor } from "@/lib/domain/form-field-metadata";
import { centsFromInput, formatRinggit } from "@/lib/domain/money";
import { getWorkflowSupervisorFlags } from "@/lib/domain/workflow-supervisor";
import { sortOrdersNewestCreatedFirst } from "@/lib/domain/order-sort";
import type {
  OperationsSnapshot,
  OrderStatus,
  ServiceOrder,
  UserRole,
} from "@/lib/domain/types";
import { getManagerEvidenceFeedback, getOrderActionFeedback, type OrderAction, type PendingOrderActions } from "@/lib/ui/order-action-feedback";

const statusMeta: Record<OrderStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-slate-100 text-slate-700" },
  assigned: { label: "Assigned", className: "bg-blue-50 text-blue-700" },
  in_progress: { label: "In progress", className: "bg-amber-50 text-amber-800" },
  job_done: { label: "Job done", className: "bg-teal-50 text-teal-800" },
  reviewed: { label: "Reviewed", className: "bg-violet-50 text-violet-800" },
  closed: { label: "Closed", className: "bg-slate-200 text-slate-700" },
};

type View = "orders" | "technician" | "review" | "dashboard" | "ai";

type Notice = { tone: "success" | "info" | "error"; message: string } | null;
type FieldErrors = Record<string, string>;

const nav = [
  { id: "orders" as const, label: "Orders", icon: ClipboardList, roles: ["admin"] as UserRole[] },
  { id: "technician" as const, label: "My jobs", icon: Wrench, roles: ["technician"] as UserRole[] },
  { id: "review" as const, label: "Review queue", icon: ClipboardCheck, roles: ["manager"] as UserRole[] },
  { id: "dashboard" as const, label: "KPI dashboard", icon: BarChart3, roles: ["manager"] as UserRole[] },
  { id: "ai" as const, label: "Operations AI", icon: Sparkles, roles: ["manager"] as UserRole[] },
];

function displayDate(value: string | null): string {
  if (!value) return "Not completed";
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}

function nextView(role: UserRole): View {
  if (role === "technician") return "technician";
  if (role === "manager") return "review";
  return "orders";
}

function buildWhatsAppUrl(order: ServiceOrder): string {
  const localDigits = order.customerPhone.replace(/\D/g, "");
  const phone = localDigits.startsWith("0") ? `60${localDigits.slice(1)}` : localDigits;
  const message = `Hi ${order.customerName},\n\nJob ${order.orderNumber} has been completed by Technician ${order.assignedTechnicianName ?? "our team"} at ${displayDate(order.completedAt)}.\n\nPlease check and leave feedback.\nThank you!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function addAudit(order: ServiceOrder, eventType: string, actorLabel: string, detail: string): ServiceOrder {
  return {
    ...order,
    auditEvents: [
      ...order.auditEvents,
      {
        id: `preview-audit-${crypto.randomUUID()}`,
        eventType,
        actorLabel,
        detail,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  const meta = statusMeta[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${meta.className}`}>{meta.label}</span>;
}

function NoticeBanner({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const styles = notice.tone === "success" ? "border-teal-200 bg-teal-50 text-teal-950" : notice.tone === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-blue-200 bg-blue-50 text-blue-950";
  return <div role="status" className={`flex gap-2 rounded-xl border px-3.5 py-3 text-sm ${styles}`}><CircleAlert className="mt-0.5 size-4 shrink-0" />{notice.message}</div>;
}

function Metric({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: typeof BriefcaseBusiness }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-slate-500">{label}</p><span className="rounded-lg bg-teal-50 p-2 text-teal-700"><Icon className="size-4" /></span></div>
      <p className="mt-5 text-2xl font-semibold tracking-[-0.035em] text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

export function OperationsConsole({ initialSnapshot, defaultScheduledAt, role }: { initialSnapshot: OperationsSnapshot; defaultScheduledAt: string; role: UserRole }) {
  const router = useRouter();
  const [view, setView] = useState<View>(nextView(role));
  const [orders, setOrders] = useState<ServiceOrder[]>(initialSnapshot.orders);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(initialSnapshot.technicians[0]?.id ?? "");
  const [notice, setNotice] = useState<Notice>(null);
  const [orderFieldErrors, setOrderFieldErrors] = useState<FieldErrors>({});
  const [completionFieldErrors, setCompletionFieldErrors] = useState<FieldErrors>({});
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [pendingOrderActions, setPendingOrderActions] = useState<PendingOrderActions>([]);
  const [closeConfirmationOrder, setCloseConfirmationOrder] = useState<ServiceOrder | null>(null);
  const [completionOrderId, setCompletionOrderId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiState, setAiState] = useState<{ loading: boolean; message: string | null; answer: string | null }>({ loading: false, message: null, answer: null });

  const sourceLabel = initialSnapshot.source === "supabase" ? "Supabase data" : "Seeded preview";


  const activeTechnician = initialSnapshot.technicians.find((technician) => technician.id === selectedTechnicianId) ?? initialSnapshot.technicians[0];
  const orderRegister = useMemo(() => sortOrdersNewestCreatedFirst(orders), [orders]);
  const dashboard = useMemo(() => {
    const today = new Date();
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const completed = orders.filter((order) => order.completedAt && new Date(order.completedAt) >= weekStart);
    const revenue = completed.reduce((total, order) => total + order.finalAmountCents, 0);
    const byTechnician = initialSnapshot.technicians.map((technician) => ({
      ...technician,
      count: completed.filter((order) => order.assignedTechnicianId === technician.id).length,
      revenue: completed.filter((order) => order.assignedTechnicianId === technician.id).reduce((total, order) => total + order.finalAmountCents, 0),
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return { completed, revenue, byTechnician };
  }, [initialSnapshot.technicians, orders]);

  function updateOrder(id: string, transform: (order: ServiceOrder) => ServiceOrder) {
    setOrders((current) => current.map((order) => (order.id === id ? transform(order) : order)));
  }

  async function signOut() {
    await fetch("/api/mock-session", { method: "DELETE" }).catch(() => undefined);
    router.replace("/login");
  }

  async function persist(path: string, init: RequestInit): Promise<boolean> {
    if (initialSnapshot.source !== "supabase") return false;
    const response = await fetch(path, init);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "The server could not save this action.");
    }
    return true;
  }

  function reloadWithSuccessNotice(message: string) {
    setNotice({ tone: "success", message: `${message} Refreshing data…` });
    window.setTimeout(() => window.location.reload(), 700);
  }

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderFieldErrors({});
    const form = new FormData(event.currentTarget);
    const technicianId = String(form.get("technicianId") || "");
    const technician = initialSnapshot.technicians.find((item) => item.id === technicianId) ?? null;
    let quotedAmountCents: number;
    try {
      quotedAmountCents = centsFromInput(String(form.get("quotedAmount") || ""));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Enter a valid quoted amount.";
      setOrderFieldErrors({ quotedAmount: message });
      setNotice({ tone: "error", message });
      return;
    }
    const payload = {
      branchId: String(form.get("branchId")),
      customerName: String(form.get("customerName")),
      customerPhone: String(form.get("customerPhone")),
      address: String(form.get("address")),
      issue: String(form.get("issue")),
      serviceType: String(form.get("serviceType")),
      quotedAmountCents,
      assignedTechnicianId: technician?.id ?? null,
      adminNotes: String(form.get("adminNotes") || "").trim() || null,
      scheduledAt: new Date(String(form.get("scheduledAt"))).toISOString(),
    };
    setIsCreatingOrder(true);
    try {
      const saved = await persist("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (saved) {
        reloadWithSuccessNotice("Service order created and assigned. The new order is now in the register.");
        return;
      }
      const now = new Date().toISOString();
      const preview: ServiceOrder = {
        id: `preview-${crypto.randomUUID()}`,
        orderNumber: formatOrderNumber(new Date(), Math.max(0, ...orders.map((order) => Number(order.orderNumber.split("-").at(-1)) || 0)) + 1),
        status: technician ? "assigned" : "new",
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        address: payload.address,
        issue: payload.issue,
        serviceType: payload.serviceType,
        quotedAmountCents,
        extraChargesCents: 0,
        finalAmountCents: quotedAmountCents,
        assignedTechnicianId: technician?.id ?? null,
        assignedTechnicianName: technician?.name ?? null,
        adminNotes: payload.adminNotes,
        scheduledAt: payload.scheduledAt,
        completedAt: null,
        createdAt: now,
        auditEvents: [
          { id: `preview-created-${crypto.randomUUID()}`, eventType: "created", actorLabel: "Admin Demo", detail: "Preview order created.", createdAt: now },
          ...(technician ? [{ id: `preview-assigned-${crypto.randomUUID()}`, eventType: "assigned", actorLabel: "Admin Demo", detail: `Assigned to ${technician.name}.`, createdAt: now }] : []),
        ],
      };
      setOrders((current) => [preview, ...current]);
      event.currentTarget.reset();
      setNotice({ tone: "success", message: "Preview order created. It will reset on refresh until local Supabase variables are configured." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to create the order." });
    } finally {
      setIsCreatingOrder(false);
    }
  }

  async function advanceOrder(order: ServiceOrder, to: "in_progress" | "reviewed" | "closed", actorLabel: string, detail: string) {
    const action: OrderAction = to === "in_progress" ? "start" : to === "reviewed" ? "review" : "close";
    const successMessage = to === "in_progress"
      ? "Job started. It is now in progress."
      : to === "reviewed"
        ? "Job marked as reviewed."
        : "Job closed.";
    setPendingOrderActions((current) => [...current.filter((item) => item.orderId !== order.id), { orderId: order.id, action }]);
    try {
      const actorRole = to === "in_progress" ? "technician" : "manager";
      const saved = await persist(`/api/orders/${order.id}/transition`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ to, actorLabel, actorRole, actorTechnicianId: to === "in_progress" ? activeTechnician?.id ?? null : null }) });
      if (saved) {
        if (to === "closed") setCloseConfirmationOrder(null);
        reloadWithSuccessNotice(successMessage);
        return;
      }
      updateOrder(order.id, (current) => addAudit({ ...current, status: to }, to === "in_progress" ? "started" : to, actorLabel, detail));
      setNotice({ tone: "success", message: `Preview updated to ${statusMeta[to].label.toLowerCase()}. It resets on refresh.` });
      if (to === "closed") setCloseConfirmationOrder(null);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to update this job." });
    } finally {
      setPendingOrderActions((current) => current.filter((item) => item.orderId !== order.id || item.action !== action));
    }
  }

  async function handleCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCompletionFieldErrors({});
    const order = orders.find((item) => item.id === completionOrderId);
    if (!order || !activeTechnician) return;
    if (selectedFiles.length > MAX_EVIDENCE_FILES) {
      const message = evidenceFileLimitMessage(selectedFiles.length) ?? "A job completion can include at most six files.";
      setCompletionFieldErrors({ evidence: message });
      setNotice({ tone: "error", message });
      return;
    }
    const form = new FormData(event.currentTarget);
    let extraChargesCents: number;
    let paymentAmountCents: number;
    try {
      extraChargesCents = centsFromInput(String(form.get("extraCharges") || "0"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Enter a valid extra charge amount.";
      setCompletionFieldErrors({ extraCharges: message });
      setNotice({ tone: "error", message });
      return;
    }
    try {
      paymentAmountCents = centsFromInput(String(form.get("paymentAmount") || "0"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Enter a valid payment amount.";
      setCompletionFieldErrors({ paymentAmount: message });
      setNotice({ tone: "error", message });
      return;
    }
    setIsCompleting(true);
    try {
      const payload = new FormData();
      payload.set("orderId", order.id);
      payload.set("actorLabel", activeTechnician.name);
      payload.set("actorTechnicianId", activeTechnician.id);
      payload.set("workDoneNotes", String(form.get("workDoneNotes") || ""));
      payload.set("remarks", String(form.get("remarks") || ""));
      payload.set("extraChargesCents", String(extraChargesCents));
      payload.set("paymentAmountCents", String(paymentAmountCents));
      payload.set("paymentMethod", String(form.get("paymentMethod") || "cash"));
      selectedFiles.forEach((file) => payload.append("evidence", file));
      const saved = await persist("/api/completions", { method: "POST", body: payload });
      if (saved) {
        reloadWithSuccessNotice("Service completion recorded. The Manager review queue has been updated.");
        return;
      }
      const completedAt = new Date().toISOString();
      const finalAmountCents = order.quotedAmountCents + extraChargesCents;
      updateOrder(order.id, (current) => {
        let updated: ServiceOrder = {
          ...current,
          status: "job_done",
          extraChargesCents,
          finalAmountCents,
          completedAt,
          workDoneNotes: String(form.get("workDoneNotes")),
          remarks: String(form.get("remarks") || "").trim() || null,
          payment: paymentAmountCents > 0 ? { amountCents: paymentAmountCents, method: String(form.get("paymentMethod")), receiptRecorded: selectedFiles.length > 0 } : null,
          evidenceFileCount: selectedFiles.length,
        };
        updated = addAudit(updated, "completed", activeTechnician.name, `Completion recorded. Final amount: ${formatRinggit(finalAmountCents)}.`);
        if (paymentAmountCents > 0) updated = addAudit(updated, "payment_recorded", activeTechnician.name, `Payment recorded by ${String(form.get("paymentMethod"))}.`);
        return addAudit(updated, "notification_generated", "System", "WhatsApp completion message generated.");
      });
      setCompletionOrderId(null);
      setSelectedFiles([]);
      setNotice({ tone: "success", message: "Preview completion recorded. Open the customer WhatsApp message from the completed job card." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Unable to record this completion." });
    } finally {
      setIsCompleting(false);
    }
  }

  async function askAi(question: string) {
    if (!question.trim()) return;
    setAiQuestion(question);
    setAiState({ loading: true, answer: null, message: null });
    try {
      const response = await fetch("/api/manager/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const body = (await response.json()) as { status?: string; answer?: string; message?: string };
      if (body.status === "answer" && body.answer) setAiState({ loading: false, answer: body.answer, message: null });
      else setAiState({ loading: false, answer: null, message: body.message ?? "No answer was generated." });
    } catch {
      setAiState({ loading: false, answer: null, message: "The Operations AI request could not be completed." });
    }
  }

  const technicianJobs = orders.filter((order) => order.assignedTechnicianId === activeTechnician?.id && !["job_done", "reviewed", "closed"].includes(order.status));
  const managerQueue = orders.filter((order) => ["job_done", "reviewed"].includes(order.status));

  function changeMockTechnician(technicianId: string) {
    setSelectedTechnicianId(technicianId);
    setCompletionOrderId(null);
    setSelectedFiles([]);
    setCompletionFieldErrors({});
  }

  const availableNav = nav.filter(({ roles }) => roles.includes(role));

  return (
    <main className="min-h-dvh bg-[#f4f7f5] text-slate-900">
      <div className="grid min-h-dvh lg:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-[#123b38] px-4 py-5 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2"><div className="grid size-9 place-items-center rounded-xl bg-[#dbf06d] text-[#123b38]"><Wrench className="size-5" /></div><div><p className="text-sm font-bold tracking-tight">Sejuk Sejuk</p><p className="text-[10px] uppercase tracking-[0.16em] text-teal-100/70">Operations</p></div></div>
          <nav className="mt-10 space-y-1" aria-label="Primary">
            {availableNav.map(({ id, label, icon: Icon }) => {
              const active = view === id;
              return <button key={id} type="button" onClick={() => setView(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? "bg-white text-[#123b38] shadow-sm" : "text-teal-50 hover:bg-white/10"}`}><Icon className="size-4" />{label}</button>;
            })}
          </nav>
          <div className="mt-auto rounded-xl border border-white/15 bg-white/5 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-100/60">Data source</p><p className="mt-1 text-sm font-medium">{sourceLabel}</p><p className="mt-1 text-xs leading-5 text-teal-50/65">Mock session persists through refresh. Sign out to choose another role.</p></div>
        </aside>

        <section className="min-w-0 pb-20 lg:pb-0">
          <header className="flex min-h-[72px] items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-7">
            <div className="flex items-center gap-2 lg:hidden"><div className="grid size-8 place-items-center rounded-lg bg-[#123b38] text-[#dbf06d]"><Wrench className="size-4" /></div><span className="text-sm font-bold">Sejuk Sejuk</span></div>
            <div className="hidden text-sm text-slate-500 lg:block">Malaysia · <span className="font-medium text-slate-700">{sourceLabel}</span></div>
            <div className="flex items-center gap-2"><div className="hidden text-right sm:block"><p className="text-xs font-bold capitalize text-slate-800">{role}</p><p className="text-[11px] text-slate-500">Mock assessment sign-in</p></div><button type="button" onClick={signOut} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"><LogOut className="size-3.5" />Sign out</button></div>
          </header>
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 sm:px-7">Mock sign-in · assessment-only role selection, not production authentication.</div>

          <div className="mx-auto max-w-7xl p-4 sm:p-7">
            <NoticeBanner notice={notice} />
            <div className={notice ? "mt-5" : ""}>
              {view === "orders" && <AdminOrders orders={orderRegister} branches={initialSnapshot.branches} technicians={initialSnapshot.technicians} defaultScheduledAt={defaultScheduledAt} onCreate={handleCreateOrder} fieldErrors={orderFieldErrors} onFieldInput={() => setOrderFieldErrors({})} isSaving={isCreatingOrder} />}
              {view === "technician" && <TechnicianJobs activeTechnician={activeTechnician} technicians={initialSnapshot.technicians} onTechnicianChange={changeMockTechnician} jobs={technicianJobs} allOrders={orders} completionOrderId={completionOrderId} onCompletionOrderId={setCompletionOrderId} onStart={(order) => advanceOrder(order, "in_progress", activeTechnician?.name ?? "Technician", "Technician started work on site.")} onComplete={handleCompletion} completionFieldErrors={completionFieldErrors} onCompletionFieldInput={() => setCompletionFieldErrors({})} selectedFiles={selectedFiles} onFilesChange={setSelectedFiles} pendingOrderActions={pendingOrderActions} isCompleting={isCompleting} />}
              {view === "review" && <ReviewQueue orders={managerQueue} pendingOrderActions={pendingOrderActions} onReview={(order) => advanceOrder(order, "reviewed", "Manager Demo", "Manager reviewed the completion.")} onClose={(order) => setCloseConfirmationOrder(order)} />}
              {view === "dashboard" && <KpiDashboard dashboard={dashboard} reschedules={initialSnapshot.weeklyRescheduleCount} />}
              {view === "ai" && <OperationsAi question={aiQuestion} state={aiState} onQuestionChange={setAiQuestion} onAsk={askAi} />}
            </div>
          </div>
        </section>
      </div>
      <nav className={`fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200 bg-white px-1 py-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] lg:hidden ${availableNav.length === 1 ? "grid-cols-1" : "grid-cols-3"}`} aria-label="Mobile navigation">
        {availableNav.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setView(id)} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-bold ${view === id ? "text-teal-700" : "text-slate-400"}`}><Icon className="size-4" />{label === "Operations AI" ? "Ops AI" : label.split(" ")[0]}</button>)}
      </nav>
      {closeConfirmationOrder && <CloseConfirmation order={closeConfirmationOrder} pendingOrderActions={pendingOrderActions} onCancel={() => setCloseConfirmationOrder(null)} onConfirm={() => advanceOrder(closeConfirmationOrder, "closed", "Manager Demo", "Manager closed the reviewed job.")} />}
    </main>
  );
}

function AdminOrders({ orders, branches, technicians, defaultScheduledAt, onCreate, fieldErrors, onFieldInput, isSaving }: { orders: ServiceOrder[]; branches: OperationsSnapshot["branches"]; technicians: OperationsSnapshot["technicians"]; defaultScheduledAt: string; onCreate: (event: FormEvent<HTMLFormElement>) => void; fieldErrors: FieldErrors; onFieldInput: () => void; isSaving: boolean }) {
  return <div className="space-y-6">
    <SectionHeading eyebrow="Admin portal" title="Create and assign service work" description="Capture the customer request, agree the quoted price, then route the job to a field team." action={<span className="inline-flex items-center gap-2 self-start rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-800"><ShieldCheck className="size-3.5" />Admin-only assignment</span>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={onCreate} onInput={onFieldInput} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-950">New service order</h2><p className="mt-1 text-sm text-slate-500">Order number is generated by the database when saved.</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">NEW</span></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Customer name" name="customerName" placeholder="e.g. Ahmad Rahman" required />
          <Field label="Phone" name="customerPhone" placeholder="012-345 6789" type="tel" required />
          <div className="sm:col-span-2"><Field label="Service address" name="address" placeholder="No. 12, Jalan Sejuk, Shah Alam" required /></div>
          <div className="sm:col-span-2"><Field label="Problem description" name="issue" placeholder="Describe the fault, affected unit, and access details." required textarea /></div>
          <SelectField label="Service type" name="serviceType" options={["General servicing", "Chemical wash", "Diagnostic and repair", "Installation", "Gas refill"]} />
          <Field label="Quoted price (RM)" name="quotedAmount" placeholder="180.00" inputMode="decimal" required error={fieldErrors.quotedAmount} />
          <SelectField label="Branch" name="branchId" options={branches.map((branch) => `${branch.name} — ${branch.city}`)} values={branches.map((branch) => branch.id)} />
          <SelectField label="Assigned technician" name="technicianId" options={["Choose a technician", ...technicians.map((technician) => `${technician.name} · ${technician.code}`)]} values={["", ...technicians.map((technician) => technician.id)]} required />
          <Field label="Scheduled visit" name="scheduledAt" type="datetime-local" defaultValue={defaultScheduledAt} required />
          <Field label="Admin notes" name="adminNotes" placeholder="Optional access, parking, or customer notes." textarea />
        </div>
        <button disabled={isSaving} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#123b38] px-4 text-sm font-bold text-white transition hover:bg-[#0d302d] disabled:opacity-60 sm:w-auto"><Plus className="size-4" />{isSaving ? "Saving…" : "Create service order"}</button>
      </form>
      <aside className="space-y-4"><div className="rounded-2xl bg-[#123b38] p-5 text-white"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#dbf06d]">Order controls</p><h2 className="mt-2 text-lg font-semibold">A visible operational handoff.</h2><ul className="mt-4 space-y-3 text-sm leading-5 text-teal-50/85"><li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#dbf06d]" />Assignment produces an audit event.</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#dbf06d]" />Only the assigned technician appears on that job.</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#dbf06d]" />Money is calculated in cents on the server.</li></ul></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Today’s queue</p><p className="mt-2 text-3xl font-semibold tracking-tight">{orders.filter((order) => !["closed", "reviewed", "job_done"].includes(order.status)).length}</p><p className="mt-1 text-sm text-slate-500">open field jobs</p></div></aside>
    </div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-4 py-4 sm:px-6"><h2 className="font-semibold">Order register</h2></div><div className="divide-y divide-slate-100">{orders.map((order) => <article key={order.id} className="grid gap-3 p-4 sm:grid-cols-[130px_minmax(0,1fr)_auto] sm:items-center sm:px-6"><div><p className="font-mono text-xs font-bold text-teal-700">{order.orderNumber}</p><p className="mt-1 text-xs text-slate-500">{displayDate(order.scheduledAt)}</p></div><div><p className="font-semibold text-slate-900">{order.customerName} <span className="font-normal text-slate-400">· {order.serviceType}</span></p><p className="mt-1 truncate text-sm text-slate-500">{order.address}</p></div><div className="flex items-center justify-between gap-3 sm:block sm:text-right"><StatusPill status={order.status} /><p className="mt-1 text-sm font-semibold text-slate-900">{formatRinggit(order.finalAmountCents)}</p></div></article>)}</div></section>
  </div>;
}

function TechnicianJobs({ activeTechnician, technicians, onTechnicianChange, jobs, allOrders, completionOrderId, onCompletionOrderId, onStart, onComplete, completionFieldErrors, onCompletionFieldInput, selectedFiles, onFilesChange, pendingOrderActions, isCompleting }: { activeTechnician: OperationsSnapshot["technicians"][number] | undefined; technicians: OperationsSnapshot["technicians"]; onTechnicianChange: (technicianId: string) => void; jobs: ServiceOrder[]; allOrders: ServiceOrder[]; completionOrderId: string | null; onCompletionOrderId: (id: string | null) => void; onStart: (order: ServiceOrder) => void; onComplete: (event: FormEvent<HTMLFormElement>) => void; completionFieldErrors: FieldErrors; onCompletionFieldInput: () => void; selectedFiles: File[]; onFilesChange: (files: File[]) => void; pendingOrderActions: PendingOrderActions; isCompleting: boolean }) {
  const completionOrder = allOrders.find((order) => order.id === completionOrderId);
  return <div className="space-y-5">
    <SectionHeading eyebrow="Technician portal" title="Complete work without the desktop clutter" description="Use the assessment switcher to simulate a field user. Only jobs assigned to that technician appear, and only that technician can start or complete them." action={<label className="self-start text-xs font-semibold text-slate-700"><span className="mb-1 block">Mock field user</span><select aria-label="Mock field user" value={activeTechnician?.id ?? ""} onChange={(event) => onTechnicianChange(event.target.value)} className="min-h-10 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100">{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name} · {technician.code}</option>)}</select></label>} />
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Assigned to you" value={String(jobs.length)} hint="active field jobs" icon={BriefcaseBusiness} /><Metric label="Evidence limit" value="≤ 6" hint="photos, video, or PDF" icon={FileText} /><Metric label="Current user" value={activeTechnician?.name ?? "—"} hint={activeTechnician?.code ?? ""} icon={Wrench} /></div>
    {jobs.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><CheckCircle2 className="mx-auto size-7 text-teal-600" /><h2 className="mt-3 font-semibold">No active jobs for this technician</h2><p className="mt-1 text-sm text-slate-500">No new field jobs are currently assigned to this technician.</p></div> : <div className="grid gap-4 xl:grid-cols-2">{jobs.map((order) => <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 bg-slate-50 px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs font-bold text-teal-700">{order.orderNumber}</span><StatusPill status={order.status} /></div></div><div className="p-4"><p className="text-lg font-semibold tracking-tight">{order.customerName}</p><a className="mt-1 inline-flex items-center gap-1 text-sm text-teal-700 underline-offset-2 hover:underline" href={`tel:${order.customerPhone}`}><Phone className="size-3.5" />{order.customerPhone}</a><p className="mt-4 text-sm leading-6 text-slate-700">{order.address}</p><div className="mt-4 rounded-xl bg-[#f3f7f3] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-teal-700">Customer issue</p><p className="mt-1 text-sm leading-5 text-slate-800">{order.issue}</p></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">Service</dt><dd className="mt-1 font-semibold">{order.serviceType}</dd></div><div><dt className="text-xs text-slate-500">Quoted</dt><dd className="mt-1 font-semibold">{formatRinggit(order.quotedAmountCents)}</dd></div></dl><div className="mt-5">{order.status === "assigned" ? <button disabled={getOrderActionFeedback({ orderId: order.id, action: "start", fallbackLabel: "Start job", pending: pendingOrderActions }).pending} aria-busy={getOrderActionFeedback({ orderId: order.id, action: "start", fallbackLabel: "Start job", pending: pendingOrderActions }).pending || undefined} type="button" onClick={() => onStart(order)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#123b38] text-sm font-bold text-white disabled:cursor-wait disabled:opacity-70">{getOrderActionFeedback({ orderId: order.id, action: "start", fallbackLabel: "Start job", pending: pendingOrderActions }).pending ? <LoaderCircle className="size-4 animate-spin" /> : <Wrench className="size-4" />}{getOrderActionFeedback({ orderId: order.id, action: "start", fallbackLabel: "Start job", pending: pendingOrderActions }).label}</button> : <button disabled={isCompleting} aria-busy={isCompleting || undefined} type="button" onClick={() => onCompletionOrderId(order.id)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#dbf06d] text-sm font-bold text-[#123b38] disabled:cursor-wait disabled:opacity-70">{isCompleting ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{isCompleting ? "Completing…" : "Complete service"}</button>}</div></div></article>)}</div>}
    {completionOrder && <CompletionSheet order={completionOrder} technician={activeTechnician?.name ?? "Technician"} selectedFiles={selectedFiles} onFilesChange={onFilesChange} fieldErrors={completionFieldErrors} onFieldInput={onCompletionFieldInput} onClose={() => onCompletionOrderId(null)} onSubmit={onComplete} isSaving={isCompleting} />}
  </div>;
}

function CompletionSheet({ order, technician, selectedFiles, onFilesChange, fieldErrors, onFieldInput, onClose, onSubmit, isSaving }: { order: ServiceOrder; technician: string; selectedFiles: File[]; onFilesChange: (files: File[]) => void; fieldErrors: FieldErrors; onFieldInput: () => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; isSaving: boolean }) {
  const [extra, setExtra] = useState("0");
  let calculated = order.quotedAmountCents;
  try { calculated += centsFromInput(extra || "0"); } catch { /* Inline validation happens on submit. */ }
  const evidenceLimitError = evidenceFileLimitMessage(selectedFiles.length);
  return <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/40 p-3 sm:p-6"><div className="mx-auto min-h-full max-w-2xl"><form onSubmit={onSubmit} onInput={onFieldInput} className="rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4"><div><p className="font-mono text-xs font-bold text-teal-700">{order.orderNumber}</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Complete service</h2><p className="mt-1 text-sm text-slate-500">Assigned technician: {technician}</p></div><button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button></div><div className="space-y-5 p-5"><div className="rounded-xl bg-[#f3f7f3] p-4"><p className="text-sm font-semibold">Final amount is protected</p><p className="mt-1 text-sm text-slate-600">Quoted {formatRinggit(order.quotedAmountCents)} + extra charges = <span className="font-bold text-slate-950">{formatRinggit(calculated)}</span></p></div><Field label="Work done" name="workDoneNotes" placeholder="What was inspected, repaired, or serviced?" required textarea error={fieldErrors.workDoneNotes} /><Field label="Extra charges (RM)" name="extraCharges" value={extra} onChange={(event) => setExtra(event.target.value)} inputMode="decimal" error={fieldErrors.extraCharges} /><div><label htmlFor="evidence-files" className="text-sm font-semibold text-slate-800">Evidence files <span className="font-normal text-slate-500">(up to {MAX_EVIDENCE_FILES})</span></label><input id="evidence-files" type="file" multiple accept="image/*,video/*,application/pdf" capture="environment" aria-invalid={Boolean(evidenceLimitError)} aria-describedby={evidenceLimitError ? "evidence-files-error" : undefined} onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))} className="mt-2 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs" /><p className="mt-2 text-xs text-slate-500">{selectedFiles.length}/{MAX_EVIDENCE_FILES} selected. Images, video, or PDF. Maximum 20 MB each.</p>{evidenceLimitError && <p id="evidence-files-error" role="alert" className="mt-2 text-xs font-semibold text-red-700">{evidenceLimitError}</p>}{selectedFiles.length > 0 && <ul className="mt-2 space-y-1 text-xs text-slate-600">{selectedFiles.map((file, index) => <li key={`${file.name}-${file.size}-${index}`} className="truncate">• {file.name}</li>)}</ul>}</div><div className="grid gap-4 sm:grid-cols-2"><Field label="Payment received (RM)" name="paymentAmount" placeholder="0" defaultValue="0" inputMode="decimal" error={fieldErrors.paymentAmount} /><SelectField label="Payment method" name="paymentMethod" options={["cash", "duitnow", "card", "bank_transfer"]} /></div><Field label="Remarks" name="remarks" placeholder="Optional customer advice or follow-up note." textarea /><button disabled={isSaving || Boolean(evidenceLimitError)} className="sticky bottom-3 z-10 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#123b38] text-sm font-bold text-white shadow-lg disabled:opacity-60"><CheckCircle2 className="size-4" />{isSaving ? "Recording completion…" : "Mark job done"}</button></div></form></div></div>;
}

function ReviewQueue({ orders, pendingOrderActions, onReview, onClose }: { orders: ServiceOrder[]; pendingOrderActions: PendingOrderActions; onReview: (order: ServiceOrder) => void; onClose: (order: ServiceOrder) => void }) {
  return <div className="space-y-6"><SectionHeading eyebrow="Manager review" title="Verify completion before closure" description="Review completed work, evidence status, payment record, and price variance before the job moves forward." />{orders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><ClipboardCheck className="mx-auto size-7 text-teal-600" /><h2 className="mt-3 font-semibold">Review queue is clear</h2><p className="mt-1 text-sm text-slate-500">Completed jobs will appear here after technicians submit them.</p></div> : <div className="grid gap-4 xl:grid-cols-2">{orders.map((order) => { const variance = order.finalAmountCents - order.quotedAmountCents; const supervisorFlags = getWorkflowSupervisorFlags({ status: order.status, quotedAmountCents: order.quotedAmountCents, finalAmountCents: order.finalAmountCents, evidenceFileCount: order.evidenceFileCount ?? 0 }); const evidenceFeedback = getManagerEvidenceFeedback(order.evidenceFileCount ?? 0); const action: OrderAction = order.status === "job_done" ? "review" : "close"; const actionFeedback = getOrderActionFeedback({ orderId: order.id, action, fallbackLabel: order.status === "job_done" ? "Mark reviewed" : "Close job", pending: pendingOrderActions }); return <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs font-bold text-teal-700">{order.orderNumber}</p><h2 className="mt-1 text-lg font-semibold">{order.customerName}</h2><p className="mt-1 text-sm text-slate-500">Completed by {order.assignedTechnicianName} · {displayDate(order.completedAt)}</p></div><StatusPill status={order.status} /></div><div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center"><div><p className="text-[10px] uppercase tracking-wide text-slate-500">Quoted</p><p className="mt-1 text-sm font-semibold">{formatRinggit(order.quotedAmountCents)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-slate-500">Final</p><p className="mt-1 text-sm font-semibold">{formatRinggit(order.finalAmountCents)}</p></div><div><p className="text-[10px] uppercase tracking-wide text-slate-500">Variance</p><p className={`mt-1 text-sm font-semibold ${variance > 0 ? "text-amber-700" : "text-teal-700"}`}>{variance > 0 ? "+" : ""}{formatRinggit(Math.abs(variance))}</p></div></div><section className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3"><div className="flex items-center gap-2"><Sparkles className="size-4 text-violet-700" /><p className="text-xs font-bold uppercase tracking-[0.1em] text-violet-800">AI Workflow Supervisor</p></div><p className="mt-1 text-xs leading-5 text-violet-900/80">Rule-backed review signals only. Manager retains every review and closure decision.</p>{supervisorFlags.length === 0 ? <p className="mt-3 text-sm font-medium text-violet-900">No Supervisor flags from the current job facts.</p> : <ul className="mt-3 space-y-2">{supervisorFlags.map((flag) => <li key={flag.code} className="rounded-lg border border-violet-200 bg-white/80 p-2.5"><p className="text-sm font-bold text-violet-950">{flag.label}</p><p className="mt-0.5 text-xs leading-5 text-violet-900/80">{flag.detail}</p></li>)}</ul>}</section><div className="mt-5 space-y-3 text-sm"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-teal-600" /><span>Work notes: {order.workDoneNotes ?? "Not recorded"}</span></div><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-teal-600" /><span>Payment: {order.payment ? `${formatRinggit(order.payment.amountCents)} by ${order.payment.method}` : "No payment recorded"}</span></div><div className="flex items-start gap-2"><CircleAlert className={`mt-0.5 size-4 ${evidenceFeedback.value === "None recorded" ? "text-amber-600" : "text-teal-600"}`} /><span>{evidenceFeedback.label}: {evidenceFeedback.value}</span></div></div><a href={buildWhatsAppUrl(order)} target="_blank" rel="noreferrer" className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#dbf06d] text-sm font-bold text-[#123b38] hover:bg-[#cde45b]"><MessageCircle className="size-4" />Open WhatsApp feedback message <ArrowUpRight className="size-3.5" /></a><p className="mt-2 text-center text-xs text-slate-500">This opens a pre-filled message. Sending it remains a human action in WhatsApp.</p><button disabled={actionFeedback.pending} aria-busy={actionFeedback.pending || undefined} onClick={() => order.status === "job_done" ? onReview(order) : onClose(order)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#123b38] text-sm font-bold text-[#123b38] hover:bg-[#123b38] hover:text-white disabled:cursor-wait disabled:opacity-70">{actionFeedback.pending ? <LoaderCircle className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}{actionFeedback.label}</button></article>; })}</div>}</div>;
}

function CloseConfirmation({ order, pendingOrderActions, onCancel, onConfirm }: { order: ServiceOrder; pendingOrderActions: PendingOrderActions; onCancel: () => void; onConfirm: () => void }) {
  const feedback = getOrderActionFeedback({ orderId: order.id, action: "close", fallbackLabel: "Close job", pending: pendingOrderActions });
  const evidence = getManagerEvidenceFeedback(order.evidenceFileCount ?? 0);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="close-confirmation-title" aria-describedby="close-confirmation-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-50 p-2 text-amber-700"><CircleAlert className="size-5" /></div><div><p className="font-mono text-xs font-bold text-teal-700">{order.orderNumber}</p><h2 id="close-confirmation-title" className="mt-1 text-xl font-semibold tracking-tight">Close this reviewed job?</h2></div></div><p id="close-confirmation-description" className="mt-4 text-sm leading-6 text-slate-600">Closing is a final workflow action. Confirm that the completion and Manager review are ready to close.</p><dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Final amount</dt><dd className="font-semibold text-slate-950">{formatRinggit(order.finalAmountCents)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">{evidence.label}</dt><dd className="font-semibold text-slate-950">{evidence.value}</dd></div></dl><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={feedback.pending} onClick={onCancel} className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60">Cancel</button><button type="button" disabled={feedback.pending} aria-busy={feedback.pending || undefined} onClick={onConfirm} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#123b38] px-4 text-sm font-bold text-white hover:bg-[#0d302d] disabled:cursor-wait disabled:opacity-70">{feedback.pending ? <LoaderCircle className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}{feedback.label}</button></div></section></div>;
}

function KpiDashboard({ dashboard, reschedules }: { dashboard: { completed: ServiceOrder[]; revenue: number; byTechnician: (OperationsSnapshot["technicians"][number] & { count: number; revenue: number })[] }; reschedules: number }) {
  const max = Math.max(1, ...dashboard.byTechnician.map((item) => item.count));
  return <div className="space-y-6"><SectionHeading eyebrow="Weekly KPI dashboard" title="Performance from completed work" description="A manager view of job throughput, recorded final amounts, and reschedule volume from the operational data." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Jobs completed" value={String(dashboard.completed.length)} hint="in demo data window" icon={CheckCircle2} /><Metric label="Total amount" value={formatRinggit(dashboard.revenue)} hint="final service amounts" icon={ReceiptText} /><Metric label="Reschedules" value={String(reschedules)} hint="recorded this week" icon={BriefcaseBusiness} /><Metric label="Team active" value={String(dashboard.byTechnician.filter((item) => item.count > 0).length)} hint="technicians with completed jobs" icon={Wrench} /></div><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Technician leaderboard</p><h2 className="mt-1 text-lg font-semibold">Completed jobs</h2></div><span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700">This week</span></div><div className="mt-7 space-y-5">{dashboard.byTechnician.map((technician, index) => <div key={technician.id} className="grid grid-cols-[28px_minmax(90px,150px)_minmax(0,1fr)_auto] items-center gap-3"><span className="text-sm font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span><div><p className="text-sm font-semibold">{technician.name}</p><p className="text-xs text-slate-500">{formatRinggit(technician.revenue)}</p></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#123b38]" style={{ width: `${(technician.count / max) * 100}%` }} /></div><span className="text-sm font-bold">{technician.count}</span></div>)}</div></section></div>;
}

function OperationsAi({ question, state, onQuestionChange, onAsk }: { question: string; state: { loading: boolean; message: string | null; answer: string | null }; onQuestionChange: (value: string) => void; onAsk: (value: string) => void }) {
  const examples = ["What jobs did technician Ali complete last week?", "Which technician completed the most jobs this week?", "How many jobs were completed today?", "How many jobs were completed and what total amount was earned this week?", "Which technician might be overloaded this week?", "Which completed jobs need Manager review?"];
  return <div className="space-y-6"><SectionHeading eyebrow="Operations AI" title="Ask a bounded question about service data" description="The assistant can select only one read-only query. It does not receive database access, customer phone numbers, or address data." action={<span className="inline-flex items-center gap-2 self-start rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800"><ShieldCheck className="size-3.5" />Controlled retrieval</span>} /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><form aria-busy={state.loading || undefined} onSubmit={(event) => { event.preventDefault(); onAsk(question); }}><label htmlFor="ai-question" className="text-sm font-semibold">Manager question</label><textarea id="ai-question" value={question} onChange={(event) => onQuestionChange(event.target.value)} disabled={state.loading} maxLength={500} placeholder="Ask about completed jobs, amounts earned, or technician performance." className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm leading-6 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{question.length}/500</span><button disabled={state.loading || question.trim().length < 3} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#123b38] px-4 text-sm font-bold text-white disabled:opacity-50">{state.loading ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{state.loading ? "Retrieving…" : "Ask Operations AI"}</button></div></form>{(state.answer || state.message) && <div role="status" aria-live="polite" aria-atomic="true" className={`mt-5 rounded-xl border p-4 ${state.answer ? "border-teal-200 bg-teal-50" : "border-amber-200 bg-amber-50"}`}><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{state.answer ? "Verified response" : "Assistant limitation"}</p><p className="mt-2 text-sm leading-6 text-slate-800">{state.answer ?? state.message}</p></div>}</section><aside className="rounded-2xl bg-[#123b38] p-5 text-white"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#dbf06d]">Supported queries</p><p className="mt-2 text-sm leading-6 text-teal-50/80">Use a suggested question to exercise a concrete, audited tool path.</p><div className="mt-5 space-y-2">{examples.map((example) => <button key={example} type="button" disabled={state.loading} onClick={() => { onQuestionChange(example); onAsk(example); }} className="flex w-full items-start gap-2 rounded-xl border border-white/15 bg-white/5 p-3 text-left text-xs leading-5 text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-50"><ChevronRight className="mt-0.5 size-3.5 shrink-0 text-[#dbf06d]" />{example}</button>)}</div><div className="mt-6 border-t border-white/15 pt-4 text-xs leading-5 text-teal-50/65">Tool outputs are capped and server-validated. A model answer is only shown if its accompanying data exactly matches the tool result.</div></aside></div></div>;
}

function Field({ label, name, placeholder, type = "text", required, textarea, defaultValue, value, onChange, inputMode, error }: { label: string; name: string; placeholder?: string; type?: string; required?: boolean; textarea?: boolean; defaultValue?: string; value?: string; onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; error?: string }) {
  const metadata = fieldMetadataFor(name) ?? {};
  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const classes = `mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${error ? "border-red-500 focus:border-red-600 focus:ring-red-100" : "border-slate-300 focus:border-teal-600 focus:ring-teal-100"}`;
  const a11y = { "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined };

  return <div><label htmlFor={inputId} className="block text-sm font-semibold text-slate-800">{label}{textarea ? <textarea id={inputId} name={name} placeholder={placeholder} required={required} defaultValue={defaultValue} autoComplete={metadata.autoComplete} maxLength={metadata.maxLength} enterKeyHint={metadata.enterKeyHint} {...a11y} className={`${classes} min-h-24 resize-y`} /> : <input id={inputId} name={name} placeholder={placeholder} type={type} required={required} defaultValue={defaultValue} value={value} onChange={onChange} inputMode={inputMode} autoComplete={metadata.autoComplete} maxLength={metadata.maxLength} enterKeyHint={metadata.enterKeyHint} {...a11y} className={classes} />}</label>{error && <p id={errorId} role="alert" className="mt-1.5 text-xs font-semibold text-red-700">{error}</p>}</div>;
}

function SelectField({ label, name, options, values, required }: { label: string; name: string; options: string[]; values?: string[]; required?: boolean }) { return <label className="block text-sm font-semibold text-slate-800">{label}<select name={name} required={required} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">{options.map((option, index) => <option key={`${option}-${index}`} value={values?.[index] ?? option}>{option}</option>)}</select></label>; }
