import "server-only";

import { demoSnapshot } from "@/lib/demo-data";
import { getPeriodBounds } from "@/lib/domain/date-period";
import type { OperationsSnapshot, OrderStatus, ServiceOrder } from "@/lib/domain/types";
import { createServerSupabaseClient, hasSupabaseConfiguration } from "@/lib/supabase/server";

type QueryOrder = {
  id: string;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  address: string;
  issue: string;
  service_type: string;
  quoted_amount_cents: number;
  extra_charges_cents: number;
  final_amount_cents: number;
  admin_notes: string | null;
  scheduled_at: string;
  completed_at: string | null;
  created_at: string;
  technicians: { id: string; name: string } | null;
  service_completions: { work_done_notes: string; remarks: string | null }[] | null;
  payment_records: { amount_cents: number; method: string }[] | null;
  audit_events: { id: string; event_type: string; actor_label: string; detail: string; created_at: string }[] | null;
};

function mapOrder(row: QueryOrder): ServiceOrder {
  const completion = row.service_completions?.[0];
  const payment = row.payment_records?.[0];
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    address: row.address,
    issue: row.issue,
    serviceType: row.service_type,
    quotedAmountCents: row.quoted_amount_cents,
    extraChargesCents: row.extra_charges_cents,
    finalAmountCents: row.final_amount_cents,
    assignedTechnicianId: row.technicians?.id ?? null,
    assignedTechnicianName: row.technicians?.name ?? null,
    adminNotes: row.admin_notes,
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    workDoneNotes: completion?.work_done_notes ?? null,
    remarks: completion?.remarks ?? null,
    payment: payment ? { amountCents: payment.amount_cents, method: payment.method, receiptRecorded: true } : null,
    auditEvents: (row.audit_events ?? []).map((event) => ({ id: event.id, eventType: event.event_type, actorLabel: event.actor_label, detail: event.detail, createdAt: event.created_at })),
  };
}

export async function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  if (!hasSupabaseConfiguration()) return demoSnapshot;

  try {
    const client = createServerSupabaseClient();
    const { start } = getPeriodBounds("this_week");
    const [branchesResult, techniciansResult, ordersResult, reschedulesResult] = await Promise.all([
      client.from("branches").select("id, name, city").order("name"),
      client.from("technicians").select("id, name, employee_code, active, branches(name)").order("name"),
      client.from("service_orders").select("id, order_number, status, customer_name, customer_phone, address, issue, service_type, quoted_amount_cents, extra_charges_cents, final_amount_cents, admin_notes, scheduled_at, completed_at, created_at, technicians(id, name), service_completions(work_done_notes, remarks), payment_records(amount_cents, method), audit_events(id, event_type, actor_label, detail, created_at)").order("scheduled_at", { ascending: true }),
      client.from("reschedule_events").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString()),
    ]);

    if (branchesResult.error || techniciansResult.error || ordersResult.error || reschedulesResult.error) return demoSnapshot;

    const branches = (branchesResult.data ?? []) as { id: string; name: string; city: string }[];
    const technicians = (techniciansResult.data ?? []) as unknown as { id: string; name: string; employee_code: string; active: boolean; branches: { name: string } | null }[];
    const orders = (ordersResult.data ?? []) as unknown as QueryOrder[];

    return {
      source: "supabase",
      branches,
      technicians: technicians.map((technician) => ({ id: technician.id, name: technician.name, code: technician.employee_code, active: technician.active, branchName: technician.branches?.name ?? "Unassigned branch" })),
      orders: orders.map(mapOrder),
      weeklyRescheduleCount: reschedulesResult.count ?? 0,
    };
  } catch {
    return demoSnapshot;
  }
}
