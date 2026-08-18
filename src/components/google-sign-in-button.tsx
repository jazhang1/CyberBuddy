"use client";

import { useState } from "react";
import { GoogleIcon } from "~/components/google-icon";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/client";

export function GoogleSignInButton({ nextPath = "/" }: { nextPath?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={loading}
      onClick={handleClick}
    >
      <GoogleIcon className="size-4" />
      Continue with Google
    </Button>
  );
}
