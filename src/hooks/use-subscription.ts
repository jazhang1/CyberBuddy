"use client";

import { useEffect, useState } from "react";
import { useUser } from "~/hooks/use-user";
import { createClient } from "~/lib/supabase/client";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

interface SubscriptionState {
  isSubscribed: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
}

const EMPTY_STATE: SubscriptionState = {
  isSubscribed: false,
  status: null,
  currentPeriodEnd: null,
};

export function useSubscription() {
  const { user, loading: userLoading } = useUser();
  const [subscription, setSubscription] =
    useState<SubscriptionState>(EMPTY_STATE);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (userLoading) return;

    if (!user) {
      setSubscription(EMPTY_STATE);
      setChecking(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setSubscription({
          isSubscribed: ACTIVE_STATUSES.has(data?.status ?? ""),
          status: data?.status ?? null,
          currentPeriodEnd: data?.current_period_end ?? null,
        });
        setChecking(false);
      });
  }, [user, userLoading]);

  return { ...subscription, loading: userLoading || checking };
}
