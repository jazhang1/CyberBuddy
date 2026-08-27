"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { useRequireUser } from "~/hooks/use-require-user";
import { createClient } from "~/lib/supabase/client";

const EXPERIENCE_LEVELS = [
  { value: "none", label: "None — I'm completely new to this" },
  { value: "self-taught", label: "Some — I've picked up things on my own" },
  { value: "studying", label: "Studying or working toward a certification" },
  { value: "working", label: "I work in a related field" },
];

// Buckets rather than a raw number since that's all the UI offers. Stored,
// but not used in any matching/generation logic yet -- that's for later.
const HOURS_PER_WEEK_OPTIONS = [
  { value: "1-3", label: "1–3 hours" },
  { value: "4-7", label: "4–7 hours" },
  { value: "8+", label: "8+ hours" },
];

// The 4 fixed goal-role options. Stored as `goal_role`, not yet used in any
// matching logic.
const GOAL_ROLES = [
  {
    value: "soc_analyst",
    label:
      "I want to watch for and investigate suspicious activity across a company's systems",
  },
  {
    value: "penetration_testing",
    label:
      "I want to try to break into systems, with permission, to find weaknesses before attackers do",
  },
  {
    value: "grc",
    label:
      "I want to help organizations manage risk, write security policies, and make sure they follow the rules",
  },
  {
    value: "general",
    label: "I'm not sure yet — show me the general starting point",
  },
];

interface FormState {
  experienceLevel: string;
  occupation: string;
  hoursPerWeek: string;
  goalRole: string;
  question1: string;
  question2: string;
  question3: string;
}

const BLANK_STATE: FormState = {
  experienceLevel: "",
  occupation: "",
  hoursPerWeek: "",
  goalRole: "",
  question1: "",
  question2: "",
  question3: "",
};

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export default function QuestionsPage() {
  const { user, loading: userLoading } = useRequireUser();

  // The whole form as one snapshot, plus a simple undo/redo history of past
  // and future snapshots. Every field edit pushes the pre-edit snapshot onto
  // `past` and clears `future` -- standard linear undo/redo.
  const [formState, setFormState] = useState<FormState>(BLANK_STATE);
  const [past, setPast] = useState<FormState[]>([]);
  const [future, setFuture] = useState<FormState[]>([]);

  // Preserves the original onboarding-completed timestamp across edits
  // instead of bumping it every save.
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState<
    string | null
  >(null);

  const [answersLoading, setAnswersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    Promise.all([
      supabase
        .from("profiles")
        .select(
          "experience_level, occupation, hours_per_week, onboarding_completed_at",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("background_answers")
        .select("question_1, question_2, question_3, goal_role")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]).then(([{ data: profile }, { data: answers }]) => {
      setFormState({
        experienceLevel: profile?.experience_level ?? "",
        occupation: profile?.occupation ?? "",
        hoursPerWeek: profile?.hours_per_week ?? "",
        goalRole: answers?.goal_role ?? "",
        question1: answers?.question_1 ?? "",
        question2: answers?.question_2 ?? "",
        question3: answers?.question_3 ?? "",
      });
      setOnboardingCompletedAt(profile?.onboarding_completed_at ?? null);
      setAnswersLoading(false);
    });
  }, [user]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setPast([...past, formState]);
    setFuture([]);
    setFormState({ ...formState, [key]: value });
    setSaved(false);
  }

  function handleUndo() {
    if (past.length === 0) return;
    const previous = past[past.length - 1] as FormState;
    setPast(past.slice(0, -1));
    setFuture([formState, ...future]);
    setFormState(previous);
    setSaved(false);
  }

  function handleRedo() {
    if (future.length === 0) return;
    const next = future[0] as FormState;
    setFuture(future.slice(1));
    setPast([...past, formState]);
    setFormState(next);
    setSaved(false);
  }

  function handleClear() {
    setPast([...past, formState]);
    setFuture([]);
    setFormState(BLANK_STATE);
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    const [{ error: profileError }, { error: answersError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .update({
            experience_level: formState.experienceLevel,
            occupation: formState.occupation,
            hours_per_week: formState.hoursPerWeek,
            onboarding_completed_at:
              onboardingCompletedAt ?? new Date().toISOString(),
          })
          .eq("id", user.id),
        supabase.from("background_answers").upsert({
          user_id: user.id,
          question_1: formState.question1,
          question_2: formState.question2,
          question_3: formState.question3,
          goal_role: formState.goalRole,
        }),
      ]);

    setSaving(false);

    if (profileError || answersError) {
      setError(
        (profileError ?? answersError)?.message ?? "Something went wrong.",
      );
      return;
    }

    if (!onboardingCompletedAt) {
      setOnboardingCompletedAt(new Date().toISOString());
    }
    setSaved(true);
  }

  if (userLoading || !user || answersLoading) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Skeleton className="h-6 w-48" />
        <div className="mt-6 flex flex-col gap-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your answers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us about yourself and your goals. Come back and edit any of
              this whenever you like.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Undo"
              disabled={past.length === 0}
              onClick={handleUndo}
            >
              ←
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Redo"
              disabled={future.length === 0}
              onClick={handleRedo}
            >
              →
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={handleClear}
            >
              Clear
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>About you</CardTitle>
            <CardDescription>
              A couple quick questions to help tailor your path.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="experience-level">
                How much cybersecurity experience do you have?
              </Label>
              <select
                id="experience-level"
                value={formState.experienceLevel}
                onChange={(event) =>
                  updateField("experienceLevel", event.target.value)
                }
                className={selectClassName}
              >
                <option value="">Select one</option>
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="occupation">What's your occupation?</Label>
              <Input
                id="occupation"
                value={formState.occupation}
                onChange={(event) =>
                  updateField("occupation", event.target.value)
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hours-per-week">
                How many hours per week can you spend on this?
              </Label>
              <select
                id="hours-per-week"
                value={formState.hoursPerWeek}
                onChange={(event) =>
                  updateField("hoursPerWeek", event.target.value)
                }
                className={selectClassName}
              >
                <option value="">Select one</option>
                {HOURS_PER_WEEK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* small spacer between the onboarding section and the goals/background section */}
        <div className="h-1" />

        <Card>
          <CardHeader>
            <CardTitle>Your goals</CardTitle>
            <CardDescription>
              A few more questions to help build your first-step list.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-role">
                Which of these sounds closest to what you want to do?
              </Label>
              <select
                id="goal-role"
                value={formState.goalRole}
                onChange={(event) =>
                  updateField("goalRole", event.target.value)
                }
                className={selectClassName}
              >
                <option value="">Select one</option>
                {GOAL_ROLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="question-1">Question 1</Label>
              <Textarea
                id="question-1"
                value={formState.question1}
                onChange={(event) =>
                  updateField("question1", event.target.value)
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="question-2">Question 2</Label>
              <Textarea
                id="question-2"
                value={formState.question2}
                onChange={(event) =>
                  updateField("question2", event.target.value)
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="question-3">Question 3</Label>
              <Textarea
                id="question-3"
                value={formState.question3}
                onChange={(event) =>
                  updateField("question3", event.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-muted-foreground">Saved.</p>
        )}
        <Button type="submit" disabled={saving} className="self-start">
          {saving ? "Saving..." : "Save"}
        </Button>
      </form>
    </main>
  );
}
