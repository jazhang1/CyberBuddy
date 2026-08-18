"use client";

import { useEffect, useState } from "react";
import { useUser } from "~/hooks/use-user";
import { createClient } from "~/lib/supabase/client";

export function useIsAdmin() {
  const { user, loading: userLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }

    const supabase = createClient();
    supabase.rpc("is_admin").then(({ data }) => {
      setIsAdmin(Boolean(data));
      setChecking(false);
    });
  }, [user, userLoading]);

  return { isAdmin, loading: userLoading || checking };
}
