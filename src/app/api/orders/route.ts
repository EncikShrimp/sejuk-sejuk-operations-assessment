import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createServiceOrder, isPersistenceUnavailable } from "@/lib/api/operations";
import { hasMockRole, MOCK_ROLE_COOKIE } from "@/lib/mock-session";

export async function POST(request: Request) {
  const session = await cookies();
  if (!hasMockRole(session.get(MOCK_ROLE_COOKIE)?.value, "admin")) {
    return NextResponse.json({ error: "Order assignment is available only to the Admin assessment role." }, { status: 403 });
  }

  try {
    const order = await createServiceOrder(await request.json());
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (isPersistenceUnavailable(error)) return NextResponse.json({ error: "Persistence is unavailable until Supabase server configuration is provided." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create service order." }, { status: 400 });
  }
}
