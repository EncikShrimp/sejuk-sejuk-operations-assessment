import { formatRinggit } from "../domain/money";
import type { WorkflowSupervisorFlag } from "../domain/workflow-supervisor";

export type SafeToolResult =
  | { kind: "completed_jobs"; technician: string; period: string; jobs: { orderNumber: string; serviceType: string; finalAmountCents: number; completedAt: string }[] }
  | { kind: "completion_summary"; period: "today" | "this_week" | "last_week" | "all_time"; completedJobs: number; totalAmountCents: number }
  | { kind: "top_technician"; period: string; technician: string | null; completedJobs: number }
  | { kind: "completed_job_count"; date: "today"; count: number }
  | { kind: "workload_insight"; period: "this_week"; teamAverageActiveJobs: number; workloadThreshold: number; watchlist: { technician: string; activeJobs: number; completedJobs: number }[] }
  | { kind: "workflow_review_watchlist"; jobs: { orderNumber: string; flags: WorkflowSupervisorFlag[] }[] };

function formatAverage(value: number): string {
  return value.toFixed(1);
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
  if (result.kind === "workload_insight") {
    if (result.watchlist.length === 0) return `No technician is on the workload watchlist this week. The active-team average is ${formatAverage(result.teamAverageActiveJobs)} jobs and the watchlist threshold is ${result.workloadThreshold} active jobs.`;
    const listed = result.watchlist.map((item) => `${item.technician} is on the workload watchlist this week with ${item.activeJobs} active jobs, against a team average of ${formatAverage(result.teamAverageActiveJobs)}`).join("; ");
    return `${listed}. The watchlist threshold is ${result.workloadThreshold} active jobs. This is a Manager-review signal, not an automated scheduling decision.`;
  }
  if (result.kind === "workflow_review_watchlist") {
    if (result.jobs.length === 0) return "No completed jobs currently need Manager review under the Workflow Supervisor rules.";
    const listed = result.jobs.map((job) => `${job.orderNumber} — ${job.flags.map((flag) => `${flag.label}: ${flag.detail.replace(/[.]+$/, "")}`).join("; ")}`).join(" | ");
    return `Manager review watchlist: ${listed}. These rule-backed signals do not change workflow status.`;
  }
  if (result.jobs.length === 0) return `No completed jobs were found for ${result.technician} in ${result.period.replace("_", " ")}.`;
  return `${result.technician} completed ${result.jobs.length} job${result.jobs.length === 1 ? "" : "s"} in ${result.period.replace("_", " ")}: ${result.jobs.map((job) => `${job.orderNumber} – ${job.serviceType}`).join("; ")}.`;
}
