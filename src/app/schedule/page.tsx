"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useRequireUser } from "~/hooks/use-require-user";
import type { Schedule } from "~/lib/schedule-schema";
import { groupStepsByWeek } from "~/lib/schedule-schema";

interface Entitlement {
  isSubscribed: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  freeGenerationUsed: boolean;
  canRegenerateAt: string | null;
}

interface ScheduleResponse {
  schedule: (Schedule & { tier: "free" | "paid" }) | null;
  entitlement: Entitlement;
}

const WEEKS = [1, 2, 3, 4];

export default function SchedulePageRoute() {
  return (
    <Suspense>
      <SchedulePage />
    </Suspense>
  );
}

function SchedulePage() {
  const { user, loading: userLoading } = useRequireUser();
  const searchParams = useSearchParams();
  const checkoutState = searchParams.get("checkout");

  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"generate" | "checkout" | "portal" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/schedule");
    const body: ScheduleResponse = await res.json();
    setData(body);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    void refetch();
  }, [user, refetch]);

  useEffect(() => {
    // The webhook may briefly race the checkout redirect, so poll once more
    // shortly after landing back from a successful checkout.
    if (checkoutState !== "success" || !user) return;
    const timeout = setTimeout(() => void refetch(), 2000);
    return () => clearTimeout(timeout);
  }, [checkoutState, user, refetch]);

  async function handleGenerate() {
    setError(null);
    setBusy("generate");

    try {
      const res = await fetch("/api/schedule", { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Something went wrong.");
        return;
      }

      await refetch();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSubscribe() {
    setError(null);
    setBusy("checkout");

    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = await res.json();

      if (!res.ok || !body.url) {
        setError(body.error ?? "Failed to start checkout.");
        setBusy(null);
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  async function handleManageBilling() {
    setError(null);
    setBusy("portal");

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();

      if (!res.ok || !body.url) {
        setError(body.error ?? "Failed to open billing portal.");
        setBusy(null);
        return;
      }

      window.location.href = body.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  if (userLoading || !user || loading || !data) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Skeleton className="h-6 w-48" />
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </main>
    );
  }

  const { schedule, entitlement } = data;
  const stepsByWeek = schedule ? groupStepsByWeek(schedule.steps) : null;
  const isRegenerateCoolingDown =
    !!entitlement.canRegenerateAt &&
    new Date(entitlement.canRegenerateAt) > new Date();

  let primaryAction: {
    label: string;
    disabled: boolean;
    onClick: () => void;
  };

  if (!schedule) {
    primaryAction = {
      label: busy === "generate" ? "Generating..." : "Generate my schedule",
      disabled: busy !== null,
      onClick: handleGenerate,
    };
  } else if (schedule.tier === "free" && !entitlement.isSubscribed) {
    primaryAction = {
      label: busy === "checkout" ? "Redirecting..." : "Subscribe — $8/mo",
      disabled: busy !== null,
      onClick: handleSubscribe,
    };
  } else if (schedule.tier === "free" && entitlement.isSubscribed) {
    primaryAction = {
      label: busy === "generate" ? "Unlocking..." : "Unlock my full month",
      disabled: busy !== null,
      onClick: handleGenerate,
    };
  } else {
    primaryAction = {
      label: busy === "generate" ? "Regenerating..." : "Regenerate",
      disabled: busy !== null || isRegenerateCoolingDown,
      onClick: handleGenerate,
    };
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      {checkoutState === "success" && (
        <p className="mb-4 rounded-md bg-muted p-3 text-sm">
          Subscription confirmed — thanks for subscribing!
        </p>
      )}
      {checkoutState === "cancel" && (
        <p className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Checkout canceled.
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Your schedule</h1>
            <Badge variant={entitlement.isSubscribed ? "default" : "secondary"}>
              {entitlement.isSubscribed ? "Subscribed" : "Free plan"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            A short, doable list of first steps, tailored to your answers.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
          >
            {primaryAction.label}
          </Button>
          {entitlement.isSubscribed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManageBilling}
              disabled={busy !== null}
            >
              Manage billing
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-destructive">
          {error}{" "}
          {error.includes("background questions") && (
            <Link href="/questions" className="underline">
              Answer them now
            </Link>
          )}
        </p>
      )}

      {schedule?.tier === "paid" && isRegenerateCoolingDown && (
        <p className="mt-2 text-sm text-muted-foreground">
          You can regenerate again on{" "}
          {new Date(entitlement.canRegenerateAt as string).toLocaleString()}.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {busy === "generate" &&
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}

        {busy === null && !schedule && !error && (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have a schedule yet. Generate one above.
          </p>
        )}

        {busy === null &&
          schedule &&
          WEEKS.map((week) => {
            const steps = stepsByWeek?.get(week);

            if (steps) {
              return steps.map((step) => (
                <Card key={`${week}-${step.title}`}>
                  <CardHeader>
                    <CardDescription>{step.timeframe}</CardDescription>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              ));
            }

            // No content generated for this week yet — show a locked
            // placeholder rather than blurring real content that doesn't
            // exist (we never generate weeks 2-4 for non-payers).
            return (
              <Card key={week} className="border-dashed">
                <CardHeader>
                  <CardDescription>Week {week}</CardDescription>
                  <CardTitle className="text-base text-muted-foreground">
                    Locked
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {entitlement.isSubscribed
                      ? 'Click "Unlock my full month" above to generate this week.'
                      : "Subscribe for $8/mo to unlock this week."}
                  </p>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </main>
  );
}
