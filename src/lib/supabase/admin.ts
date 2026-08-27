import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "~/env";

// Service-role client: bypasses RLS entirely. Only use for trusted
// server-to-server writes where there is no user session to authenticate
// the write (currently: the Stripe webhook). Never import this from a
// "use client" file or a route that trusts caller-supplied identifiers
// without independently verifying them first.
export function createAdminClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
