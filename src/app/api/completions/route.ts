import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { completeServiceOrder, isPersistenceUnavailable } from "@/lib/api/operations";
import { hasMockRole, MOCK_ROLE_COOKIE } from "@/lib/mock-session";

export async function POST(request: Request) {
  const session = await cookies();
  if (!hasMockRole(session.get(MOCK_ROLE_COOKIE)?.value, "technician")) {
    return NextResponse.json({ error: "Service completion is available only to the Technician assessment role." }, { status: 403 });
  }

  try {
    const result = await completeServiceOrder(await request.formData());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (isPersistenceUnavailable(error)) return NextResponse.json({ error: "Persistence is unavailable until Supabase server configuration is provided." }, { status: 503 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to complete service order." }, { status: 400 });
  }
}
