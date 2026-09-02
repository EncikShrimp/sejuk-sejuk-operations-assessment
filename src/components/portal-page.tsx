import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OperationsConsole } from "@/components/operations-console";
import { getOperationsSnapshot } from "@/lib/data/operations";
import { isMockRole, MOCK_ROLE_COOKIE, portalPathForRole } from "@/lib/mock-session";
import type { UserRole } from "@/lib/domain/types";

export async function PortalPage({ expectedRole }: { expectedRole: UserRole }) {
  const cookieStore = await cookies();
  const role = cookieStore.get(MOCK_ROLE_COOKIE)?.value;
  if (!isMockRole(role)) redirect("/login");
  if (role !== expectedRole) redirect(portalPathForRole(role));

  const snapshot = await getOperationsSnapshot();
  const defaultScheduledAt = snapshot.orders.find((order) => order.status === "assigned" || order.status === "in_progress")?.scheduledAt.slice(0, 16) ?? "";
  return <OperationsConsole initialSnapshot={snapshot} defaultScheduledAt={defaultScheduledAt} role={role} />;
}
