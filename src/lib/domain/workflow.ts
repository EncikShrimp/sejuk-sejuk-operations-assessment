import type { OrderStatus } from "./types";

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  new: "assigned",
  assigned: "in_progress",
  in_progress: "job_done",
  job_done: "reviewed",
  reviewed: "closed",
  closed: null,
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUS[from] === to;
}

export function transitionOrderStatus(from: OrderStatus, to: OrderStatus): OrderStatus {
  if (!canTransition(from, to)) {
    throw new Error(`Transition from ${from} to ${to} is not allowed.`);
  }
  return to;
}
