import "server-only";

import { getPeriodBounds } from "@/lib/domain/date-period";
import { formatRinggit } from "@/lib/domain/money";
import { createServerSupabaseClient, hasSupabaseConfiguration } from "@/lib/supabase/server";

import type { ValidatedToolCall } from "./tool-contracts";

type CompletedJob = { order_number: string; service_type: string; final_amount_cents: number; completed_at: string };
type CompletionSummaryRow = { completed_jobs: number; total_amount_cents: number };

export type SafeToolResult =
  | { kind: "completed_jobs"; technician: string; period: string; jobs: { orderNumber: string; serviceType: string; finalAmountCents: number; completedAt: string }[] }
  | { kind: "completion_summary"; period: "today" | "this_week" | "last_week" | "all_time"; completedJobs: number; totalAmountCents: number }
  | { kind: "top_technician"; period: string; technician: string | null; completedJobs: number }
  | { kind: "completed_job_count"; date: "today"; count: number };

function assertAiDataAvailable(): void {
  if (!hasSupabaseConfiguration()) throw new Error("AI_DATA_UNAVAILABLE");
}

export async function executeReadOnlyToolCall(call: ValidatedToolCall): Promise<SafeToolResult> {
  assertAiDataAvailable();
  const client = createServerSupabaseClient();

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

export function formatSafeToolResult(result: SafeToolResult): string {
  if (result.kind === "completion_summary") {
    const period = result.period === "all_time" ? "all time" : result.period.replace("_", " ");
    return `${result.completedJobs} job${result.completedJobs === 1 ? " was" : "s were"} completed in ${period}, with a total final amount of ${formatRinggit(result.totalAmountCents)}.`;
  }
  if (result.kind === "completed_job_count") return `${result.count} job${result.count === 1 ? " was" : "s were"} completed today.`;
  if (result.kind === "top_technician") {
    return result.technician ? `${result.technician} is top for ${result.period.replace("_", " ")} with ${result.completedJobs} completed job${result.completedJobs === 1 ? "" : "s"}.` : `No completed jobs were found for ${result.period.replace("_", " ")}.`;
  }
  if (result.jobs.length === 0) return `No completed jobs were found for ${result.technician} in ${result.period.replace("_", " ")}.`;
  return `${result.technician} completed ${result.jobs.length} job${result.jobs.length === 1 ? "" : "s"} in ${result.period.replace("_", " ")}: ${result.jobs.map((job) => `${job.orderNumber} – ${job.serviceType}`).join("; ")}.`;
}
