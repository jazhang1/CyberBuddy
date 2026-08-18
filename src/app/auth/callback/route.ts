import { NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      let onboardingCompleted = false;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed_at")
          .eq("id", userId)
          .maybeSingle();
        onboardingCompleted = Boolean(profile?.onboarding_completed_at);
      }

      return NextResponse.redirect(
        `${origin}${onboardingCompleted ? "/" : "/onboarding"}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
