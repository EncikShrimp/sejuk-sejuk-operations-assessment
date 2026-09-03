import "server-only";

import { z } from "zod";

import { formatSafeToolResult, executeReadOnlyToolCall, type SafeToolResult } from "./read-tools";
import { AI_TECHNICIANS, AI_TOOL_DEFINITIONS, validateToolCall } from "./tool-contracts";
import { completionSummaryCallForQuestion, workflowReviewWatchlistCallForQuestion, workloadCallForQuestion } from "./query-intent";
import { hasSupabaseConfiguration } from "@/lib/supabase/server";

const questionSchema = z.string().trim().min(3).max(500);

const guidance = `I can answer completed-job lists for ${AI_TECHNICIANS.join(", ")}; the top technician; completed-job counts; total completed-job amounts for today, this week, last week, or all time; this week's technician workload watchlist; and completed jobs needing Manager review.`;

type DeepSeekMessage = {
  content?: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
};

function isSupportedQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return Boolean(completionSummaryCallForQuestion(question)) || Boolean(workloadCallForQuestion(question)) || Boolean(workflowReviewWatchlistCallForQuestion(question)) || (normalized.includes("complet") && (normalized.includes("job") || normalized.includes("today"))) || normalized.includes("top technician");
}

async function callDeepSeek(body: unknown): Promise<DeepSeekMessage> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("DEEPSEEK_UNAVAILABLE");
  const parsed = (await response.json()) as { choices?: { message?: DeepSeekMessage }[] };
  const message = parsed.choices?.[0]?.message;
  if (!message) throw new Error("DEEPSEEK_UNAVAILABLE");
  return message;
}

function exactDataMatch(candidate: unknown, result: SafeToolResult): boolean {
  return JSON.stringify(candidate) === JSON.stringify(result);
}

async function safelyFormatWithModel(question: string, toolCall: { id: string; type: "function"; function: { name: string; arguments: string } }, result: SafeToolResult): Promise<string> {
  try {
    const message = await callDeepSeek({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Format only the authoritative tool result. Return a JSON object with answer (a concise plain-language string) and data (an exact copy of the tool result). Do not add facts. If you mention an amount, use RM, never dollars or $." },
        { role: "user", content: question },
        { role: "assistant", content: null, tool_calls: [toolCall] },
        { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) },
      ],
    });
    const candidate = z.object({ answer: z.string().trim().min(1).max(800), data: z.unknown() }).safeParse(JSON.parse(message.content ?? ""));
    if (candidate.success && exactDataMatch(candidate.data.data, result) && !candidate.data.answer.includes("$")) return candidate.data.answer;
  } catch {
    // A deterministic formatter is safer than presenting an unverified model answer.
  }
  return formatSafeToolResult(result);
}

export async function answerOperationsQuestion(input: unknown) {
  const question = questionSchema.parse(input);
  if (!isSupportedQuestion(question)) return { status: "guidance" as const, message: guidance };
  if (!hasSupabaseConfiguration()) return { status: "unavailable" as const, message: "Supabase is not configured, so manager AI retrieval is unavailable." };

  const completionSummaryCall = completionSummaryCallForQuestion(question);
  if (completionSummaryCall) {
    const result = await executeReadOnlyToolCall(completionSummaryCall);
    return { status: "answer" as const, answer: formatSafeToolResult(result), result };
  }

  const workloadCall = workloadCallForQuestion(question);
  if (workloadCall) {
    const result = await executeReadOnlyToolCall(workloadCall);
    return { status: "answer" as const, answer: formatSafeToolResult(result), result };
  }

  const workflowWatchlistCall = workflowReviewWatchlistCallForQuestion(question);
  if (workflowWatchlistCall) {
    const result = await executeReadOnlyToolCall(workflowWatchlistCall);
    return { status: "answer" as const, answer: formatSafeToolResult(result), result };
  }

  if (!process.env.DEEPSEEK_API_KEY) return { status: "unavailable" as const, message: "DeepSeek is not configured. Add DEEPSEEK_API_KEY to use model-selected Operations AI queries." };

  const selection = await callDeepSeek({
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    temperature: 0,
    messages: [
      { role: "system", content: "You are a tool selector for an internal operations console. Select exactly one provided function for supported questions. Never answer from memory, never request or use customer details, and never call more than one tool." },
      { role: "user", content: question },
    ],
    tools: AI_TOOL_DEFINITIONS,
    tool_choice: "auto",
  });
  const toolCalls = selection.tool_calls ?? [];
  if (toolCalls.length !== 1) return { status: "guidance" as const, message: guidance };

  let call;
  try {
    call = validateToolCall({ name: toolCalls[0].function.name, arguments: JSON.parse(toolCalls[0].function.arguments) });
  } catch {
    return { status: "guidance" as const, message: guidance };
  }

  const result = await executeReadOnlyToolCall(call);
  const answer = await safelyFormatWithModel(question, toolCalls[0], result);
  return { status: "answer" as const, answer, result };
}

export const aiGuidanceMessage = guidance;
