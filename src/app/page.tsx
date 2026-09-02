import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isMockRole, MOCK_ROLE_COOKIE, portalPathForRole } from "@/lib/mock-session";

export default async function Home() {
  const cookieStore = await cookies();
  const role = cookieStore.get(MOCK_ROLE_COOKIE)?.value;
  redirect(isMockRole(role) ? portalPathForRole(role) : "/login");
}
