import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { MockLoginForm } from "@/components/mock-login-form";
import { isMockRole, MOCK_ROLE_COOKIE, portalPathForRole } from "@/lib/mock-session";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get(MOCK_ROLE_COOKIE)?.value;
  if (isMockRole(role)) redirect(portalPathForRole(role));

  return <MockLoginForm />;
}
