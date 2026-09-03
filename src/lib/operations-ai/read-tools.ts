import "server-only";

import { getPeriodBounds } from "@/lib/domain/date-period";
import { getWorkflowSupervisorFlags } from "@/lib/domain/workflow-supervisor";
import type { OrderStatus } from "@/lib/domain/types";
import { createServerSupabaseClient, hasSupabaseConfiguration } from "@/lib/supabase/server";

import type { ValidatedToolCall } from "./tool-contracts";
import { deriveWorkloadInsight } from "./workload-insight";
import type { SafeToolResult } from "./tool-results";

export { formatSafeToolResult } from "./tool-results";
export type { SafeToolResult } from "./tool-results";

type CompletedJob = { order_number: string; service_type: string; final_amount_cents: number; completed_at: string };
type CompletionSummaryRow = { completed_jobs: number; total_amount_cents: number };
type TechnicianRow = { id: string; name: string };
type AssignedOrderRow = { assigned_technician_id: string | null };
type SupervisorOrderRow = {
  order_number: string;
  status: OrderStatus;
  quoted_amount_cents: number;
  final_amount_cents: number;
  service_completions: { job_attachments: { kind: "job_evidence" | "payment_receipt" }[] | null }[] | null;
};

function assertAiDataAvailable(): void {
  if (!hasSupabaseConfiguration()) throw new Error("AI_DATA_UNAVAILABLE");
}

export async function executeReadOnlyToolCall(call: ValidatedToolCall): Promise<SafeToolResult> {
  assertAiDataAvailable();
  const client = createServerSupabaseClient();

  if (call.name === "get_technician_workload") {
    const { start, end } = getPeriodBounds("this_week");
    const [techniciansResult, activeOrdersResult, completedOrdersResult] = await Promise.all([
      client.from("technicians").select("id, name").eq("active", true).order("name"),
      client
        .from("service_orders")
        .select("assigned_technician_id")
        .in("status", ["assigned", "in_progress"])
        .gte("scheduled_at", start.toISOString())
        .lt("scheduled_at", end.toISOString()),
      client
        .from("service_orders")
        .select("assigned_technician_id")
        .not("completed_at", "is", null)
        .gte("completed_at", start.toISOString())
        .lt("completed_at", end.toISOString()),
    ]);
    if (techniciansResult.error || activeOrdersResult.error || completedOrdersResult.error) throw new Error("AI query could not be completed.");

    const activeCounts = new Map<string, number>();
    for (const row of (activeOrdersResult.data ?? []) as AssignedOrderRow[]) {
      if (row.assigned_technician_id) activeCounts.set(row.assigned_technician_id, (activeCounts.get(row.assigned_technician_id) ?? 0) + 1);
    }
    const completedCounts = new Map<string, number>();
    for (const row of (completedOrdersResult.data ?? []) as AssignedOrderRow[]) {
      if (row.assigned_technician_id) completedCounts.set(row.assigned_technician_id, (completedCounts.get(row.assigned_technician_id) ?? 0) + 1);
    }
    const insight = deriveWorkloadInsight(
      ((techniciansResult.data ?? []) as TechnicianRow[]).map((technician) => ({
        technician: technician.name,
        activeJobs: activeCounts.get(technician.id) ?? 0,
        completedJobs: completedCounts.get(technician.id) ?? 0,
      })),
    );
    return { kind: "workload_insight", period: "this_week", ...insight };
  }

  if (call.name === "get_workflow_review_watchlist") {
    const { data, error } = await client
      .from("service_orders")
      .select("order_number, status, quoted_amount_cents, final_amount_cents, service_completions(job_attachments(kind))")
      .in("status", ["job_done", "reviewed"])
      .order("completed_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("AI query could not be completed.");

    const jobs = ((data ?? []) as unknown as SupervisorOrderRow[])
      .map((order) => {
        const evidenceFileCount = order.service_completions?.[0]?.job_attachments?.filter((attachment) => attachment.kind === "job_evidence").length ?? 0;
        return {
          orderNumber: order.order_number,
          flags: getWorkflowSupervisorFlags({
            status: order.status,
            quotedAmountCents: order.quoted_amount_cents,
            finalAmountCents: order.final_amount_cents,
            evidenceFileCount,
          }),
        };
      })
      .filter((order) => order.flags.length > 0);
    return { kind: "workflow_review_watchlist", jobs };
  }

  if (call.name === "get_completion_summary") {
    const bounds = call.arguments.period === "all_time" ? null : getPeriodBounds(call.arguments.period);
    const { data, error } = await client.rpc("operations_ai_completion_summary", {
      p_start: bounds?.start.toISOString() ?? null,
      p_end: bounds?.end.toISOString() ?? null,
    });
    if (error) throw new Error("AI query could not be completed.");
    const summary = (data?.[0] ?? { completed_jobs: 0, total_amount_cents: 0 }) as CompletionSummaryRow;
    return {
      kind: "completion_summary",
      period: call.arguments.period,
      completedJobs: Number(summary.completed_jobs),
      totalAmountCents: Number(summary.total_amount_cents),
    };
  }

  if (call.name === "count_completed_jobs") {
    const { start, end } = getPeriodBounds("today");
    const { count, error } = await client
      .from("service_orders")
      .select("id", { count: "exact", head: true })
      .not("completed_at", "is", null)
      .gte("completed_at", start.toISOString())
      .lt("completed_at", end.toISOString());
    if (error) throw new Error("AI query could not be completed.");
    return { kind: "completed_job_count", date: "today", count: count ?? 0 };
  }

  const { start, end } = getPeriodBounds(call.arguments.period);
  const baseQuery = client
    .from("service_orders")
    .select("order_number, service_type, final_amount_cents, completed_at, technicians!inner(name)")
    .not("completed_at", "is", null)
    .gte("completed_at", start.toISOString())
    .lt("completed_at", end.toISOString())
    .limit(100);

  if (call.name === "get_completed_jobs") {
    const { data, error } = await baseQuery.eq("technicians.name", call.arguments.technician).order("completed_at", { ascending: false });
    if (error) throw new Error("AI query could not be completed.");
    const jobs = (data ?? []) as unknown as CompletedJob[];
    return {
      kind: "completed_jobs",
      technician: call.arguments.technician,
      period: call.arguments.period,
      jobs: jobs.map((job) => ({ orderNumber: job.order_number, serviceType: job.service_type, finalAmountCents: job.final_amount_cents, completedAt: job.completed_at })),
    };
  }

  const { data, error } = await baseQuery;
  if (error) throw new Error("AI query could not be completed.");
  const rows = (data ?? []) as unknown as (CompletedJob & { technicians: { name: string } })[];
  const leaderboard = new Map<string, number>();
  for (const row of rows) {
    const name = row.technicians.name;
    leaderboard.set(name, (leaderboard.get(name) ?? 0) + 1);
  }
  const top = [...leaderboard.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return { kind: "top_technician", period: call.arguments.period, technician: top?.[0] ?? null, completedJobs: top?.[1] ?? 0 };
}
