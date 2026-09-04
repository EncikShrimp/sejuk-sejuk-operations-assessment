import type { OrderStatus } from "./types";

type TechnicianActiveJob = {
  status: OrderStatus;
  scheduledAt: string;
};

function technicianJobRank(status: OrderStatus): number {
  return status === "in_progress" ? 0 : 1;
}

export function prioritizeTechnicianJobs<T extends TechnicianActiveJob>(jobs: readonly T[]): T[] {
  return [...jobs].sort((left, right) => {
    const rankDifference = technicianJobRank(left.status) - technicianJobRank(right.status);
    if (rankDifference !== 0) return rankDifference;

    return new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime();
  });
}
