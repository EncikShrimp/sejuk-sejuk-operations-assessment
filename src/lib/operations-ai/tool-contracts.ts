import { z } from "zod";

import { SUPPORTED_PERIODS } from "../domain/date-period";

export const AI_TECHNICIANS = ["Ali", "John", "Bala", "Yusoff"] as const;

const periodSchema = z.enum(SUPPORTED_PERIODS);
const summaryPeriodSchema = z.enum([...SUPPORTED_PERIODS, "all_time"]);
const technicianSchema = z.enum(AI_TECHNICIANS);

const toolCallSchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("get_completed_jobs"),
    arguments: z.object({ technician: technicianSchema, period: periodSchema }).strict(),
  }),
  z.object({
    name: z.literal("get_top_technician"),
    arguments: z.object({ period: periodSchema }).strict(),
  }),
  z.object({
    name: z.literal("get_completion_summary"),
    arguments: z.object({ period: summaryPeriodSchema }).strict(),
  }),
  z.object({
    name: z.literal("count_completed_jobs"),
    arguments: z.object({ date: z.literal("today") }).strict(),
  }),
]);

export type ValidatedToolCall = z.infer<typeof toolCallSchema>;

export function validateToolCall(value: unknown): ValidatedToolCall {
  return toolCallSchema.parse(value);
}

export const AI_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "get_completed_jobs",
      description: "Find completed jobs for one listed technician during a supported period.",
      parameters: { type: "object", properties: { technician: { type: "string", enum: AI_TECHNICIANS }, period: { type: "string", enum: SUPPORTED_PERIODS } }, required: ["technician", "period"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_technician",
      description: "Find the technician with the most completed jobs during a supported period.",
      parameters: { type: "object", properties: { period: { type: "string", enum: SUPPORTED_PERIODS } }, required: ["period"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_completion_summary",
      description: "Return the completed-job count and total final amount for today, this week, last week, or all time. Use this for money, revenue, total amount, earned, amassed, or count-and-amount questions.",
      parameters: { type: "object", properties: { period: { type: "string", enum: [...SUPPORTED_PERIODS, "all_time"] } }, required: ["period"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "count_completed_jobs",
      description: "Count jobs completed today only.",
      parameters: { type: "object", properties: { date: { type: "string", enum: ["today"] } }, required: ["date"], additionalProperties: false },
    },
  },
] as const;
