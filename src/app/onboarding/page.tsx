"use client";

import { useRouter } from "next/navigation";
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
import { useUser } from "~/hooks/use-user";
import { createClient } from "~/lib/supabase/client";

const EXPERIENCE_LEVELS = [
  { value: "none", label: "None — I'm completely new to this" },
  { value: "self-taught", label: "Some — I've picked up things on my own" },
  { value: "studying", label: "Studying or working toward a certification" },
  { value: "working", label: "I work in a related field" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [experienceLevel, setExperienceLevel] = useState("");
  const [occupation, setOccupation] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("experience_level, occupation")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExperienceLevel(data.experience_level ?? "");
          setOccupation(data.occupation ?? "");
        }
        setProfileLoading(false);
      });
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("profiles")
      .update({
        experience_level: experienceLevel,
        occupation,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (userLoading || !user || profileLoading) {
    return (
      <main className="mx-auto max-w-sm p-8">
        <Skeleton className="h-6 w-48" />
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome to CyberBuddy</CardTitle>
          <CardDescription>
            A couple quick questions to help tailor your path.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="experience-level">
                How much cybersecurity experience do you have?
              </Label>
              <select
                id="experience-level"
                required
                value={experienceLevel}
                onChange={(event) => setExperienceLevel(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              >
                <option value="" disabled>
                  Select one
                </option>
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
                required
                value={occupation}
                onChange={(event) => setOccupation(event.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={saving} className="mt-1">
              {saving ? "Saving..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
