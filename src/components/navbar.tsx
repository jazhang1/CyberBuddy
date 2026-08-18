"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useUser } from "~/hooks/use-user";
import { createClient } from "~/lib/supabase/client";

export function Navbar() {
  const router = useRouter();
  const { user, loading } = useUser();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function handleQuestionsClick(event: MouseEvent) {
    if (!loading && !user) {
      event.preventDefault();
      router.push("/login");
    }
  }

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold tracking-tight">
            CyberBuddy
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/questions" onClick={handleQuestionsClick}>
              Questions
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : user ? (
            <>
              <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
