import { NextResponse } from "next/server";
import { z } from "zod";

import { MOCK_ROLE_COOKIE, MOCK_ROLES } from "@/lib/mock-session";

const sessionInputSchema = z.object({ role: z.enum(MOCK_ROLES) });
const cookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 8,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = sessionInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid role to continue." }, { status: 400 });

  const response = NextResponse.json({ role: parsed.data.role });
  response.cookies.set(MOCK_ROLE_COOKIE, parsed.data.role, cookieOptions);
  return response;
}

export function DELETE() {
  const response = NextResponse.json({ signedOut: true });
  response.cookies.set(MOCK_ROLE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
