export type TechnicianWorkload = {
  technician: string;
  activeJobs: number;
  completedJobs: number;
};

export type WorkloadWatchlistItem = TechnicianWorkload;

export type WorkloadInsight = {
  teamAverageActiveJobs: number;
  workloadThreshold: number;
  watchlist: WorkloadWatchlistItem[];
};

const MINIMUM_ACTIVE_JOBS_FOR_WATCHLIST = 2;
const TEAM_AVERAGE_MULTIPLIER = 1.5;

/**
 * A transparent operational heuristic, not an automated scheduling decision.
 * It flags technicians whose active jobs are at least 1.5× the active-team average,
 * with a minimum of two active jobs to avoid flagging trivial queues.
 */
export function deriveWorkloadInsight(workloads: readonly TechnicianWorkload[]): WorkloadInsight {
  const teamAverageActiveJobs = workloads.length === 0
    ? 0
    : workloads.reduce((total, workload) => total + workload.activeJobs, 0) / workloads.length;
  const workloadThreshold = Math.max(MINIMUM_ACTIVE_JOBS_FOR_WATCHLIST, Math.ceil(teamAverageActiveJobs * TEAM_AVERAGE_MULTIPLIER));

  return {
    teamAverageActiveJobs,
    workloadThreshold,
    watchlist: workloads
      .filter((workload) => workload.activeJobs >= workloadThreshold)
      .sort((first, second) => second.activeJobs - first.activeJobs || first.technician.localeCompare(second.technician)),
  };
}
