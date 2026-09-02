import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { MOCK_ROLE_COOKIE } from "@/lib/mock-session";
import { answerOperationsQuestion, aiGuidanceMessage } from "@/lib/operations-ai/assistant";

export async function POST(request: Request) {
  const session = await cookies();
  if (session.get(MOCK_ROLE_COOKIE)?.value !== "manager") {
    return NextResponse.json({ status: "forbidden", message: "Operations AI is available only to the Manager assessment role." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { question?: unknown };
    const result = await answerOperationsQuestion(body.question);
    return NextResponse.json(result, { status: result.status === "unavailable" ? 503 : 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_DATA_UNAVAILABLE") return NextResponse.json({ status: "unavailable", message: "Supabase is not configured, so manager AI retrieval is unavailable." }, { status: 503 });
    if (error instanceof Error && error.message === "DEEPSEEK_UNAVAILABLE") return NextResponse.json({ status: "unavailable", message: "DeepSeek could not be reached. No result was generated." }, { status: 503 });
    return NextResponse.json({ status: "guidance", message: aiGuidanceMessage }, { status: 400 });
  }
}
