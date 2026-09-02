export const ORDER_STATUSES = [
  "new",
  "assigned",
  "in_progress",
  "job_done",
  "reviewed",
  "closed",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type UserRole = "admin" | "technician" | "manager";

export type Technician = {
  id: string;
  name: string;
  code: string;
  branchName: string;
  active: boolean;
};

export type AuditEvent = {
  id: string;
  eventType: string;
  actorLabel: string;
  detail: string;
  createdAt: string;
};

export type ServiceOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  address: string;
  issue: string;
  serviceType: string;
  quotedAmountCents: number;
  extraChargesCents: number;
  finalAmountCents: number;
  assignedTechnicianId: string | null;
  assignedTechnicianName: string | null;
  adminNotes: string | null;
  scheduledAt: string;
  completedAt: string | null;
  createdAt: string;
  workDoneNotes?: string | null;
  remarks?: string | null;
  payment?: {
    amountCents: number;
    method: string;
    receiptRecorded: boolean;
  } | null;
  auditEvents: AuditEvent[];
};

export type OperationsSnapshot = {
  source: "supabase" | "demo";
  branches: { id: string; name: string; city: string }[];
  technicians: Technician[];
  orders: ServiceOrder[];
  weeklyRescheduleCount: number;
};
