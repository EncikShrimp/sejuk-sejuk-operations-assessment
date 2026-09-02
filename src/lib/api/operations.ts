import "server-only";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { MAX_EVIDENCE_FILES } from "@/lib/domain/evidence";
import { calculateFinalAmount } from "@/lib/domain/money";
import { transitionOrderStatus } from "@/lib/domain/workflow";
import type { OrderStatus } from "@/lib/domain/types";
import { createServerSupabaseClient, hasSupabaseConfiguration } from "@/lib/supabase/server";

const orderInputSchema = z.object({
  branchId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().min(6).max(32),
  address: z.string().trim().min(1).max(500),
  issue: z.string().trim().min(1).max(1500),
  serviceType: z.string().trim().min(1).max(120),
  quotedAmountCents: z.number().int().nonnegative(),
  assignedTechnicianId: z.string().uuid().nullable(),
  adminNotes: z.string().trim().max(3000).nullable(),
  scheduledAt: z.string().datetime(),
});

const transitionInputSchema = z.object({
  orderId: z.string().uuid(),
  to: z.enum(["in_progress", "reviewed", "closed"]),
  actorLabel: z.string().trim().min(1).max(120),
  actorRole: z.enum(["technician", "manager"]),
  actorTechnicianId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(1500).optional(),
});

export { MAX_EVIDENCE_FILES } from "@/lib/domain/evidence";
export const MAX_EVIDENCE_FILE_BYTES = 20 * 1024 * 1024;

function assertConfigured(): void {
  if (!hasSupabaseConfiguration()) {
    throw new Error("PERSISTENCE_UNAVAILABLE");
  }
}

function eventForStatus(status: OrderStatus): { type: "started" | "reviewed" | "closed"; detail: string } {
  if (status === "in_progress") return { type: "started", detail: "Technician started work on site." };
  if (status === "reviewed") return { type: "reviewed", detail: "Manager reviewed the completion." };
  return { type: "closed", detail: "Manager closed the reviewed work." };
}

export async function createServiceOrder(input: unknown) {
  assertConfigured();
  const values = orderInputSchema.parse(input);
  const client = createServerSupabaseClient();
  const status: OrderStatus = values.assignedTechnicianId ? "assigned" : "new";
  const { data, error } = await client
    .from("service_orders")
    .insert({
      order_number: "",
      branch_id: values.branchId,
      assigned_technician_id: values.assignedTechnicianId,
      status,
      customer_name: values.customerName,
      customer_phone: values.customerPhone,
      address: values.address,
      issue: values.issue,
      service_type: values.serviceType,
      quoted_amount_cents: values.quotedAmountCents,
      admin_notes: values.adminNotes,
      scheduled_at: values.scheduledAt,
    })
    .select("id, order_number, status, final_amount_cents")
    .single();

  if (error || !data) throw new Error("Unable to create the service order.");

  const auditRows = [
    { order_id: data.id, event_type: "created", actor_label: "Admin Demo", detail: "Service order created." },
    ...(values.assignedTechnicianId ? [{ order_id: data.id, event_type: "assigned", actor_label: "Admin Demo", detail: "Technician assigned at creation." }] : []),
  ];
  const { error: auditError } = await client.from("audit_events").insert(auditRows);
  if (auditError) throw new Error("Order was created but its audit event could not be recorded.");

  return data;
}

export async function transitionServiceOrder(input: unknown) {
  assertConfigured();
  const values = transitionInputSchema.parse(input);
  const client = createServerSupabaseClient();
  const { data: current, error: currentError } = await client
    .from("service_orders")
    .select("id, status, assigned_technician_id")
    .eq("id", values.orderId)
    .single();
  if (currentError || !current) throw new Error("Service order was not found.");

  if (values.to === "in_progress") {
    if (values.actorRole !== "technician" || !values.actorTechnicianId || values.actorTechnicianId !== current.assigned_technician_id) {
      throw new Error("Only the assigned technician can start this job.");
    }
  } else if (values.actorRole !== "manager") {
    throw new Error("Only a manager can review or close a job.");
  }

  const to = transitionOrderStatus(current.status as OrderStatus, values.to);
  const { error: updateError } = await client.from("service_orders").update({ status: to }).eq("id", values.orderId);
  if (updateError) throw new Error("Unable to update the service order.");

  if (to === "reviewed") {
    const { error: reviewError } = await client.from("manager_reviews").insert({ order_id: values.orderId, reviewer_label: values.actorLabel, notes: values.notes ?? null });
    if (reviewError) throw new Error("Order was reviewed but the review record could not be stored.");
  }

  const event = eventForStatus(to);
  const { error: auditError } = await client.from("audit_events").insert({ order_id: values.orderId, event_type: event.type, actor_label: values.actorLabel, detail: event.detail });
  if (auditError) throw new Error("Order was updated but its audit event could not be recorded.");

  return { status: to };
}

type EvidenceFile = File;

function isEvidenceFile(value: FormDataEntryValue): value is EvidenceFile {
  return typeof value !== "string" && typeof value.arrayBuffer === "function";
}

function validateEvidenceFiles(files: EvidenceFile[]): void {
  if (files.length > MAX_EVIDENCE_FILES) throw new Error(`A completion may include at most ${MAX_EVIDENCE_FILES} evidence files.`);
  for (const file of files) {
    const allowed = file.type === "application/pdf" || file.type.startsWith("image/") || file.type.startsWith("video/");
    if (!allowed) throw new Error("Evidence must be an image, video, or PDF.");
    if (file.size <= 0 || file.size > MAX_EVIDENCE_FILE_BYTES) throw new Error("Each evidence file must be between 1 byte and 20 MB.");
  }
}

function fileExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return extension ? `.${extension.slice(0, 12)}` : "";
}

export async function completeServiceOrder(formData: FormData) {
  assertConfigured();
  const orderId = z.string().uuid().parse(formData.get("orderId"));
  const actorLabel = z.string().trim().min(1).max(120).parse(formData.get("actorLabel"));
  const actorTechnicianId = z.string().uuid().parse(formData.get("actorTechnicianId"));
  const workDoneNotes = z.string().trim().min(1).max(3000).parse(formData.get("workDoneNotes"));
  const remarks = z.string().trim().max(3000).parse(formData.get("remarks") ?? "");
  const extraChargesCents = z.coerce.number().int().nonnegative().parse(formData.get("extraChargesCents") ?? 0);
  const paymentAmount = z.coerce.number().int().nonnegative().parse(formData.get("paymentAmountCents") ?? 0);
  const paymentMethod = z.enum(["cash", "duitnow", "card", "bank_transfer"]).parse(formData.get("paymentMethod") ?? "cash");
  const evidenceFiles = formData.getAll("evidence").filter(isEvidenceFile);
  const receiptFiles = formData.getAll("receipt").filter(isEvidenceFile);
  if (receiptFiles.length > 1) throw new Error("A payment can include one receipt evidence file.");
  const files = [
    ...evidenceFiles.map((file) => ({ file, kind: "job_evidence" as const })),
    ...receiptFiles.map((file) => ({ file, kind: "payment_receipt" as const })),
  ];
  validateEvidenceFiles(files.map(({ file }) => file));

  const client = createServerSupabaseClient();
  const { data: order, error: orderError } = await client
    .from("service_orders")
    .select("id, status, quoted_amount_cents, assigned_technician_id")
    .eq("id", orderId)
    .single();
  if (orderError || !order) throw new Error("Service order was not found.");
  if (order.assigned_technician_id !== actorTechnicianId) {
    throw new Error("Only the assigned technician can complete this job.");
  }
  transitionOrderStatus(order.status as OrderStatus, "job_done");
  const finalAmountCents = calculateFinalAmount({ quotedAmountCents: order.quoted_amount_cents, extraChargesCents });

  const { data: completion, error: completionError } = await client
    .from("service_completions")
    .insert({ order_id: orderId, work_done_notes: workDoneNotes, remarks: remarks || null, extra_charges_cents: extraChargesCents })
    .select("id, completed_at")
    .single();
  if (completionError || !completion) throw new Error("Unable to record the service completion.");

  const { error: updateError } = await client
    .from("service_orders")
    .update({ status: "job_done", extra_charges_cents: extraChargesCents })
    .eq("id", orderId);
  if (updateError) throw new Error("Completion was recorded but the order status could not be updated.");

  for (const { file, kind } of files) {
    const path = `${orderId}/${completion.id}/${randomUUID()}${fileExtension(file.name)}`;
    const { error: uploadError } = await client.storage.from("job-evidence").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error("Completion was recorded but an evidence upload failed.");
    const { error: attachmentError } = await client.from("job_attachments").insert({ completion_id: completion.id, bucket_path: path, file_name: file.name.slice(0, 255), content_type: file.type, file_size_bytes: file.size, kind });
    if (attachmentError) throw new Error("Evidence uploaded but its record could not be stored.");
  }

  if (paymentAmount > 0) {
    const { error: paymentError } = await client.from("payment_records").insert({ order_id: orderId, completion_id: completion.id, amount_cents: paymentAmount, method: paymentMethod });
    if (paymentError) throw new Error("Completion was recorded but the payment could not be stored.");
  }

  const auditRows = [
    { order_id: orderId, event_type: "completed", actor_label: actorLabel, detail: `Completion recorded. Final amount: RM${(finalAmountCents / 100).toFixed(2)}.` },
    ...(paymentAmount > 0 ? [{ order_id: orderId, event_type: "payment_recorded", actor_label: actorLabel, detail: `Payment recorded by ${paymentMethod}.` }] : []),
    { order_id: orderId, event_type: "notification_generated", actor_label: "System", detail: "WhatsApp completion message generated." },
  ];
  const { error: auditError } = await client.from("audit_events").insert(auditRows);
  if (auditError) throw new Error("Completion was recorded but its audit event could not be stored.");

  return { completedAt: completion.completed_at, finalAmountCents };
}

export function isPersistenceUnavailable(error: unknown): boolean {
  return error instanceof Error && error.message === "PERSISTENCE_UNAVAILABLE";
}
