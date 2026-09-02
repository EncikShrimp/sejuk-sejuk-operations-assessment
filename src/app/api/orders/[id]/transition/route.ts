import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isPersistenceUnavailable, transitionServiceOrder } from "@/lib/api/operations";
import { hasMockRole, MOCK_ROLE_COOKIE } from "@/lib/mock-session";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { to?: unknown; actorRole?: unknown };
    const requiredRole = body.to === "in_progress" ? "technician" : body.to === "reviewed" || body.to === "closed" ? "manager" : null;
    const session = await cookies();
    if (!requiredRole || !hasMockRole(session.get(MOCK_ROLE_COOKIE)?.value, requiredRole)) {
      return NextResponse.json({ error: "This workflow action is not available to the selected assessment role." }, { status: 403 });
    }
    if (body.actorRole !== requiredRole) {
      return NextResponse.json({ error: "The workflow actor does not match the selected assessment role." }, { status: 400 });
    }
    const result = await transitionServiceOrder({ ...body, orderId: id });
    return NextResponse.json(result);
  } catch (error) {
    if (isPersistenceUnavailable(error)) return NextResponse.json({ error: "Persistence is unavailable until Supabase server configuration is provided." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update service order." }, { status: 400 });
  }
}
