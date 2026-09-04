export type OrderAction = "start" | "review" | "close";

export type PendingOrderAction = {
  orderId: string;
  action: OrderAction;
};

export type PendingOrderActions = readonly PendingOrderAction[];

type OrderActionFeedbackInput = {
  orderId: string;
  action: OrderAction;
  fallbackLabel: string;
  pending: PendingOrderActions;
};

const pendingLabels: Record<OrderAction, string> = {
  start: "Starting…",
  review: "Reviewing…",
  close: "Closing…",
};

export function getOrderActionFeedback({ orderId, action, fallbackLabel, pending }: OrderActionFeedbackInput): { label: string; pending: boolean } {
  const isPending = pending.some((item) => item.orderId === orderId && item.action === action);
  return { label: isPending ? pendingLabels[action] : fallbackLabel, pending: isPending };
}

export function getManagerEvidenceFeedback(evidenceFileCount: number): { label: string; value: string } {
  return {
    label: "Job-evidence files",
    value: evidenceFileCount === 0 ? "None recorded" : `${evidenceFileCount} recorded`,
  };
}
