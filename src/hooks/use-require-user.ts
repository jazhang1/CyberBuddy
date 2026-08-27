"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "~/hooks/use-user";

/**
 * Like useUser, but redirects to /login once it's known the visitor is
 * signed out. Centralizes the "protected page" guard shared by every
 * authenticated-only page.
 */
export function useRequireUser() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  return { user, loading };
}
