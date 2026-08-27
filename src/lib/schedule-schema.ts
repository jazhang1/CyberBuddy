import { z } from "zod";

// Shared between the API route (as the AI SDK generation schema) and the
// frontend (to type the stored/generated schedule).
export const scheduleSchema = z.object({
  steps: z
    .array(
      z.object({
        week: z.number().int().min(1).max(4),
        title: z.string(),
        timeframe: z.string(),
        description: z.string(),
      }),
    )
    .min(3)
    .max(20),
});

export type Schedule = z.infer<typeof scheduleSchema>;
export type ScheduleStep = Schedule["steps"][number];

export function groupStepsByWeek(
  steps: ScheduleStep[],
): Map<number, ScheduleStep[]> {
  const byWeek = new Map<number, ScheduleStep[]>();
  for (const step of steps) {
    const existing = byWeek.get(step.week);
    if (existing) {
      existing.push(step);
    } else {
      byWeek.set(step.week, [step]);
    }
  }
  return byWeek;
}
