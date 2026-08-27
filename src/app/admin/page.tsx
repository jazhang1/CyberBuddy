"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { useIsAdmin } from "~/hooks/use-is-admin";
import { useRequireUser } from "~/hooks/use-require-user";
import { createClient } from "~/lib/supabase/client";

interface Answers {
  question_1: string;
  question_2: string;
  question_3: string;
}

interface UserRow {
  id: string;
  email: string;
  createdAt: string;
  answers: Answers | null;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useRequireUser();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && user && !isAdmin) {
      router.push("/");
    }
  }, [adminLoading, isAdmin, user, router]);

  useEffect(() => {
    if (!isAdmin) return;

    const supabase = createClient();
    Promise.all([
      supabase.from("profiles").select("id, email, created_at"),
      supabase
        .from("background_answers")
        .select("user_id, question_1, question_2, question_3"),
    ]).then(([profilesRes, answersRes]) => {
      if (profilesRes.error) {
        setError(profilesRes.error.message);
        return;
      }
      if (answersRes.error) {
        setError(answersRes.error.message);
        return;
      }

      const answersByUser = new Map(
        (answersRes.data ?? []).map((a) => [a.user_id, a]),
      );

      setRows(
        (profilesRes.data ?? []).map((p) => ({
          id: p.id,
          email: p.email,
          createdAt: p.created_at,
          answers: answersByUser.get(p.id) ?? null,
        })),
      );
    });
  }, [isAdmin]);

  if (userLoading || adminLoading || !isAdmin) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <Skeleton className="h-6 w-48" />
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every signed-up user and the cards they&apos;ve created.
      </p>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex flex-col gap-4">
        {rows === null ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        ) : (
          rows.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle className="text-base">{row.email}</CardTitle>
                <CardDescription>
                  Joined {new Date(row.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {row.answers ? (
                  <ol className="flex flex-col gap-2 text-sm">
                    <li>
                      <span className="font-medium">Question 1:</span>{" "}
                      {row.answers.question_1 || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </li>
                    <li>
                      <span className="font-medium">Question 2:</span>{" "}
                      {row.answers.question_2 || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </li>
                    <li>
                      <span className="font-medium">Question 3:</span>{" "}
                      {row.answers.question_3 || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </li>
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No cards yet.</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
