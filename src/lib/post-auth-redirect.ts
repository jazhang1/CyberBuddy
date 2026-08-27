import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Decides where a freshly authenticated user should land: `/questions` if
 * they haven't completed the onboarding/background questions yet, `/`
 * otherwise. Shared by every sign-in entry point (password login, OAuth
 * callback) so the rule lives in one place instead of being re-derived per
 * call site.
 */
export async function getPostAuthRedirectPath(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle();

  return profile?.onboarding_completed_at ? "/" : "/questions";
}
