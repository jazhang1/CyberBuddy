"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useIsAdmin } from "~/hooks/use-is-admin";
import { useSubscription } from "~/hooks/use-subscription";
import { useUser } from "~/hooks/use-user";
import { openBillingPortal } from "~/lib/billing-portal";
import { createClient } from "~/lib/supabase/client";

export function Navbar() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { isAdmin } = useIsAdmin();
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold tracking-tight">
            CyberBuddy
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/questions">Questions</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/schedule">Schedule</Link>
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">Admin</Link>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : user ? (
            <>
              {!subscriptionLoading && (
                <Badge variant={isSubscribed ? "default" : "secondary"}>
                  {isSubscribed ? "Subscribed" : "Free plan"}
                </Badge>
              )}
              {isSubscribed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openBillingPortal()}
                >
                  Manage billing
                </Button>
              )}
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
