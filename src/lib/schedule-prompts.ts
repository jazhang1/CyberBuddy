import type { ScheduleStep } from "~/lib/schedule-schema";

interface PromptContext {
  experienceLevel: string | null;
  occupation: string | null;
  answers: {
    question_1: string;
    question_2: string;
    question_3: string;
  };
}

function backgroundBlock({
  experienceLevel,
  occupation,
  answers,
}: PromptContext) {
  return `Experience level: ${experienceLevel ?? "unknown"}
Occupation: ${occupation ?? "unknown"}
Answers to background questions:
1. ${answers.question_1}
2. ${answers.question_2}
3. ${answers.question_3}`;
}

const COACH_INTRO =
  'You are a cybersecurity learning coach. Based on this person\'s background, produce a concrete, ordered schedule of first steps into cybersecurity. Each step needs a week number, a title, a timeframe (e.g. "Days 1-3"), and a plain-language description of what to actually do.';

// Free tier: exactly one lifetime generation, week 1 only.
export function buildWeekOnePrompt(context: PromptContext): string {
  return `${COACH_INTRO}

Only produce week 1 (3-5 steps, all with week: 1). Do not mention or plan for
later weeks.

${backgroundBlock(context)}`;
}

// Just subscribed, continuing from an existing week 1 -- must not repeat it.
export function buildContinuationPrompt(
  context: PromptContext,
  existingWeekOneSteps: ScheduleStep[],
): string {
  return `${COACH_INTRO}

This person already has this week 1 plan, which is final and must not be
repeated or restated in your output:
${JSON.stringify(existingWeekOneSteps)}

Continue naturally from it. Produce only weeks 2, 3, and 4 (week: 2, 3, or 4
on every step) that build on week 1 without duplicating it.

${backgroundBlock(context)}`;
}

// Just subscribed with no prior schedule, or a full regenerate-from-scratch.
export function buildFullMonthPrompt(context: PromptContext): string {
  return `${COACH_INTRO}

Produce a full 4-week plan covering weeks 1 through 4, with every step
tagged with its week number.

${backgroundBlock(context)}`;
}
