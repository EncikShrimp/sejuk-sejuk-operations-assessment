import type { OperationsSnapshot } from "@/lib/domain/types";

const now = new Date();
const at = (offsetHours: number) => new Date(now.getTime() + offsetHours * 60 * 60 * 1000).toISOString();
const audit = (id: string, eventType: string, actorLabel: string, detail: string, offsetHours: number) => ({
  id,
  eventType,
  actorLabel,
  detail,
  createdAt: at(offsetHours),
});

export const demoSnapshot: OperationsSnapshot = {
  source: "demo",
  weeklyRescheduleCount: 1,
  branches: [
    { id: "branch-pj", name: "Sejuk Sejuk PJ", city: "Petaling Jaya" },
    { id: "branch-penang", name: "Sejuk Sejuk Penang", city: "George Town" },
    { id: "branch-jb", name: "Sejuk Sejuk Johor", city: "Johor Bahru" },
    { id: "branch-ipoh", name: "Sejuk Sejuk Perak", city: "Ipoh" },
    { id: "branch-kuantan", name: "Sejuk Sejuk East Coast", city: "Kuantan" },
  ],
  technicians: [
    { id: "tech-ali", name: "Ali", code: "SS-T001", branchName: "Sejuk Sejuk PJ", active: true },
    { id: "tech-john", name: "John", code: "SS-T002", branchName: "Sejuk Sejuk Penang", active: true },
    { id: "tech-bala", name: "Bala", code: "SS-T003", branchName: "Sejuk Sejuk Johor", active: true },
    { id: "tech-yusoff", name: "Yusoff", code: "SS-T004", branchName: "Sejuk Sejuk Perak", active: true },
  ],
  orders: [
    {
      id: "order-41", orderNumber: "SSS-2026-00041", status: "in_progress", customerName: "Puan Siti Rahmah", customerPhone: "012-555 0188", address: "21, Jalan SS 2/72, Petaling Jaya", issue: "Indoor unit dripping after 30 minutes.", serviceType: "Chemical wash", quotedAmountCents: 18000, extraChargesCents: 0, finalAmountCents: 18000, assignedTechnicianId: "tech-ali", assignedTechnicianName: "Ali", adminNotes: "Parking at rear visitor bays.", scheduledAt: at(0), completedAt: null, createdAt: at(-1),
      auditEvents: [audit("audit-41-1", "created", "Admin Demo", "Order created and assigned to Ali.", -1), audit("audit-41-2", "assigned", "Admin Demo", "Assigned to Ali.", -0.9), audit("audit-41-3", "started", "Ali", "Technician started work on site.", -0.25)],
    },
    {
      id: "order-40", orderNumber: "SSS-2026-00040", status: "assigned", customerName: "Mr Lim Wei Jian", customerPhone: "017-310 2284", address: "8, Jalan 19/1, Section 19, George Town", issue: "Unit is not cooling consistently.", serviceType: "Diagnostic and repair", quotedAmountCents: 12000, extraChargesCents: 0, finalAmountCents: 12000, assignedTechnicianId: "tech-john", assignedTechnicianName: "John", adminNotes: "Customer works from home; call on arrival.", scheduledAt: at(2), completedAt: null, createdAt: at(-24),
      auditEvents: [audit("audit-40-1", "created", "Admin Demo", "Order created and assigned to John.", -24), audit("audit-40-2", "assigned", "Admin Demo", "Assigned to John.", -23.8)],
    },
    {
      id: "order-39", orderNumber: "SSS-2026-00039", status: "job_done", customerName: "Nurul Huda", customerPhone: "019-604 1102", address: "16, Jalan Kristal 7/70, Johor Bahru", issue: "Service two bedroom units before tenant move-in.", serviceType: "General servicing", quotedAmountCents: 28000, extraChargesCents: 3500, finalAmountCents: 31500, assignedTechnicianId: "tech-bala", assignedTechnicianName: "Bala", adminNotes: "Condo management access arranged.", scheduledAt: at(-24), completedAt: at(-3), createdAt: at(-48), workDoneNotes: "Serviced two indoor units, cleaned filters and tested drainage. Both units are cooling normally.", remarks: "Customer advised to run monthly filter clean.", payment: { amountCents: 31500, method: "DuitNow", receiptRecorded: true },
      auditEvents: [audit("audit-39-1", "completed", "Bala", "Completion recorded with RM35.00 extra charges.", -3), audit("audit-39-2", "payment_recorded", "Bala", "DuitNow payment of RM315.00 recorded.", -3), audit("audit-39-3", "notification_generated", "System", "WhatsApp completion message generated.", -3)],
    },
    {
      id: "order-38", orderNumber: "SSS-2026-00038", status: "reviewed", customerName: "Daniel Tan", customerPhone: "016-873 4201", address: "3, Jalan 16/4, Petaling Jaya", issue: "Outdoor condenser is noisy.", serviceType: "Diagnostic and repair", quotedAmountCents: 22000, extraChargesCents: 6800, finalAmountCents: 28800, assignedTechnicianId: "tech-ali", assignedTechnicianName: "Ali", adminNotes: null, scheduledAt: at(-72), completedAt: at(-48), createdAt: at(-96), workDoneNotes: "Replaced worn condenser fan capacitor and verified stable operating sound.", remarks: null, payment: { amountCents: 28800, method: "Card", receiptRecorded: true },
      auditEvents: [audit("audit-38-1", "reviewed", "Manager Demo", "Evidence and cost reviewed.", -24)],
    },
    {
      id: "order-37", orderNumber: "SSS-2026-00037", status: "closed", customerName: "Aisha Binti Salleh", customerPhone: "011-2004 8761", address: "B-12-08, Pangsapuri Bayu, George Town", issue: "Routine quarterly servicing.", serviceType: "General servicing", quotedAmountCents: 16000, extraChargesCents: 0, finalAmountCents: 16000, assignedTechnicianId: "tech-john", assignedTechnicianName: "John", adminNotes: null, scheduledAt: at(-144), completedAt: at(-120), createdAt: at(-168), workDoneNotes: "Completed chemical treatment and cooling check for both units.", remarks: null, payment: { amountCents: 16000, method: "Cash", receiptRecorded: false },
      auditEvents: [audit("audit-37-1", "closed", "Manager Demo", "Job closed after review.", -96)],
    },
    {
      id: "order-36", orderNumber: "SSS-2026-00036", status: "closed", customerName: "Kavitha Devi", customerPhone: "018-404 2622", address: "9, Jalan Sultan Azlan Shah, Ipoh", issue: "Wall unit needs a standard service and drain flush.", serviceType: "General servicing", quotedAmountCents: 15000, extraChargesCents: 0, finalAmountCents: 15000, assignedTechnicianId: "tech-yusoff", assignedTechnicianName: "Yusoff", adminNotes: null, scheduledAt: at(-96), completedAt: at(-72), createdAt: at(-120), workDoneNotes: "Cleaned indoor unit, cleared drain line, and tested cooling.", remarks: "Suggested quarterly servicing.", payment: { amountCents: 15000, method: "Bank transfer", receiptRecorded: true },
      auditEvents: [audit("audit-36-1", "completed", "Yusoff", "Completion recorded.", -72), audit("audit-36-2", "closed", "Manager Demo", "Job closed after review.", -48)],
    },
    {
      id: "order-35", orderNumber: "SSS-2026-00035", status: "closed", customerName: "Farid Ismail", customerPhone: "013-890 4572", address: "5, Jalan Bukit Bintang, Petaling Jaya", issue: "Air conditioner trips after 15 minutes.", serviceType: "Diagnostic and repair", quotedAmountCents: 21000, extraChargesCents: 1200, finalAmountCents: 22200, assignedTechnicianId: "tech-ali", assignedTechnicianName: "Ali", adminNotes: null, scheduledAt: at(-192), completedAt: at(-188), createdAt: at(-216), workDoneNotes: "Replaced damaged capacitor and verified normal running load.", remarks: null, payment: { amountCents: 22200, method: "DuitNow", receiptRecorded: true },
      auditEvents: [audit("audit-35-1", "completed", "Ali", "Completion recorded with RM12.00 extra charges.", -188), audit("audit-35-2", "closed", "Manager Demo", "Job closed after review.", -180)],
    },
    {
      id: "order-34", orderNumber: "SSS-2026-00034", status: "closed", customerName: "Siti Mazlina", customerPhone: "012-788 7712", address: "44, Jalan Kebun, Kuantan", issue: "General service for a living room cassette unit.", serviceType: "General servicing", quotedAmountCents: 19000, extraChargesCents: 0, finalAmountCents: 19000, assignedTechnicianId: "tech-ali", assignedTechnicianName: "Ali", adminNotes: null, scheduledAt: at(-216), completedAt: at(-212), createdAt: at(-240), workDoneNotes: "Cleaned filters, evaporator, and checked drainage flow.", remarks: null, payment: { amountCents: 19000, method: "Cash", receiptRecorded: true },
      auditEvents: [audit("audit-34-1", "completed", "Ali", "Completion recorded.", -212), audit("audit-34-2", "closed", "Manager Demo", "Job closed after review.", -204)],
    },
  ],
};
