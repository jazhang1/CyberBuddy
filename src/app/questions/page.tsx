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
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { useUser } from "~/hooks/use-user";
import { createClient } from "~/lib/supabase/client";

export default function QuestionsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [question1, setQuestion1] = useState("");
  const [question2, setQuestion2] = useState("");
  const [question3, setQuestion3] = useState("");
  const [answersLoading, setAnswersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    supabase
      .from("background_answers")
      .select("question_1, question_2, question_3")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setQuestion1(data.question_1 ?? "");
          setQuestion2(data.question_2 ?? "");
          setQuestion3(data.question_3 ?? "");
        }
        setAnswersLoading(false);
      });
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setError(null);
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    const { error: saveError } = await supabase
      .from("background_answers")
      .upsert({
        user_id: user.id,
        question_1: question1,
        question_2: question2,
        question_3: question3,
      });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
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
      <Card>
        <CardHeader>
          <CardTitle>Tell us about yourself</CardTitle>
          <CardDescription>
            A few quick questions to help tailor your path.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="question-1">Question 1</Label>
              <Textarea
                id="question-1"
                value={question1}
                onChange={(event) => setQuestion1(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="question-2">Question 2</Label>
              <Textarea
                id="question-2"
                value={question2}
                onChange={(event) => setQuestion2(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="question-3">Question 3</Label>
              <Textarea
                id="question-3"
                value={question3}
                onChange={(event) => setQuestion3(event.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && !error && (
              <p className="text-sm text-muted-foreground">Saved.</p>
            )}
            <Button type="submit" disabled={saving} className="self-start">
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
