import { generateObject } from "ai";
import {
  buildContinuationPrompt,
  buildFullMonthPrompt,
  buildWeekOnePrompt,
} from "~/lib/schedule-prompts";
import type { Schedule } from "~/lib/schedule-schema";
import { scheduleSchema } from "~/lib/schedule-schema";
import { createClient } from "~/lib/supabase/server";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const REGENERATE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Returns the user's stored schedule (if any) plus their entitlement state,
// so the frontend can render the right paywall/CTA without a second call.
export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const [{ data: schedule }, { data: subscription }] = await Promise.all([
    supabase
      .from("schedules")
      .select(
        "steps, tier, updated_at, free_generation_used_at, last_regenerated_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const isSubscribed = ACTIVE_STATUSES.has(subscription?.status ?? "");

  let canRegenerateAt: string | null = null;
  if (schedule?.last_regenerated_at) {
    const nextAllowed =
      new Date(schedule.last_regenerated_at).getTime() + REGENERATE_COOLDOWN_MS;
    if (nextAllowed > Date.now()) {
      canRegenerateAt = new Date(nextAllowed).toISOString();
    }
  }

  return Response.json({
    schedule: schedule
      ? {
          steps: schedule.steps,
          tier: schedule.tier,
          updatedAt: schedule.updated_at,
        }
      : null,
    entitlement: {
      isSubscribed,
      subscriptionStatus: subscription?.status ?? null,
      currentPeriodEnd: subscription?.current_period_end ?? null,
      freeGenerationUsed: Boolean(schedule?.free_generation_used_at),
      canRegenerateAt,
    },
  });
}

// Generates or extends the user's schedule, following the free/paid rules:
//   - never generated, not subscribed -> week 1 only, consumes the lifetime
//     free generation
//   - not subscribed, free generation already used -> blocked
//   - just subscribed (tier is still "free", or no schedule at all) ->
//     generate the rest of the month, exempt from the regenerate cooldown
//   - subscribed with a full "paid" schedule -> regenerate from scratch,
//     rate-limited to once every 24h
export async function POST() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const [
    { data: answers },
    { data: profile },
    { data: schedule },
    { data: subscription },
  ] = await Promise.all([
    supabase
      .from("background_answers")
      .select("question_1, question_2, question_3")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("experience_level, occupation")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("schedules")
      .select("steps, tier, free_generation_used_at, last_regenerated_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const hasAnswers =
    answers &&
    [answers.question_1, answers.question_2, answers.question_3].some(
      (a) => a.trim().length > 0,
    );

  if (!hasAnswers) {
    return Response.json(
      {
        error: "Answer the background questions before generating a schedule.",
      },
      { status: 400 },
    );
  }

  const isSubscribed = ACTIVE_STATUSES.has(subscription?.status ?? "");
  const promptContext = {
    experienceLevel: profile?.experience_level ?? null,
    occupation: profile?.occupation ?? null,
    answers: {
      question_1: answers.question_1,
      question_2: answers.question_2,
      question_3: answers.question_3,
    },
  };

  // Not subscribed and already used their one lifetime free generation.
  if (!isSubscribed && schedule?.free_generation_used_at) {
    return Response.json(
      {
        error:
          "You've used your free schedule. Subscribe to unlock the rest of the month.",
      },
      { status: 403 },
    );
  }

  let steps: Schedule["steps"];
  let tier: "free" | "paid";
  // Free generation also starts the regenerate-cooldown clock (moot in
  // practice -- a free user can never reach the paid regenerate branch --
  // but keeps the column meaningful if they later extend to paid).
  let touchRegenerateCooldown = !isSubscribed;

  if (!isSubscribed) {
    // First-ever generation: week 1 only.
    try {
      const { object } = await generateObject({
        model: "openai/gpt-5.4",
        schema: scheduleSchema,
        prompt: buildWeekOnePrompt(promptContext),
      });
      steps = object.steps;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate a schedule.";
      return Response.json({ error: message }, { status: 502 });
    }
    tier = "free";
  } else if (!schedule || schedule.tier === "free") {
    // Just subscribed: unlock the rest of the month. Exempt from the
    // regenerate cooldown -- this is the thing they just paid for.
    try {
      const { object } = await generateObject({
        model: "openai/gpt-5.4",
        schema: scheduleSchema,
        prompt: schedule
          ? buildContinuationPrompt(promptContext, schedule.steps)
          : buildFullMonthPrompt(promptContext),
      });
      steps = schedule ? [...schedule.steps, ...object.steps] : object.steps;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate a schedule.";
      return Response.json({ error: message }, { status: 502 });
    }
    tier = "paid";
  } else {
    // Already subscribed with a full schedule: regenerate from scratch,
    // rate-limited.
    if (schedule.last_regenerated_at) {
      const nextAllowed =
        new Date(schedule.last_regenerated_at).getTime() +
        REGENERATE_COOLDOWN_MS;
      if (nextAllowed > Date.now()) {
        return Response.json(
          {
            error: "You can regenerate once every 24 hours.",
            retryAfter: new Date(nextAllowed).toISOString(),
          },
          { status: 429 },
        );
      }
    }

    try {
      const { object } = await generateObject({
        model: "openai/gpt-5.4",
        schema: scheduleSchema,
        prompt: buildFullMonthPrompt(promptContext),
      });
      steps = object.steps;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate a schedule.";
      return Response.json({ error: message }, { status: 502 });
    }
    tier = "paid";
    touchRegenerateCooldown = true;
  }

  const now = new Date().toISOString();
  const { error: saveError } = await supabase.from("schedules").upsert({
    user_id: user.id,
    steps,
    tier,
    updated_at: now,
    ...(!isSubscribed ? { free_generation_used_at: now } : {}),
    ...(touchRegenerateCooldown ? { last_regenerated_at: now } : {}),
  });

  if (saveError) {
    return Response.json({ error: saveError.message }, { status: 500 });
  }

  return Response.json({ schedule: { steps, tier } });
}
