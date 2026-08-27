import { NextResponse } from "next/server";
import { getPostAuthRedirectPath } from "~/lib/post-auth-redirect";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const path = data.user
        ? await getPostAuthRedirectPath(supabase, data.user.id)
        : "/questions";

      return NextResponse.redirect(`${origin}${path}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
