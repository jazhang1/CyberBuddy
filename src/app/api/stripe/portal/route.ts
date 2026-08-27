import { stripe } from "~/lib/stripe";
import { createClient } from "~/lib/supabase/server";

// Creates a Stripe Billing Portal session so a subscriber can self-serve
// update their payment method or cancel.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return Response.json(
      { error: "No billing account found." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${origin}/schedule`,
    });

    return Response.json({ url: portalSession.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to open billing portal.";
    return Response.json({ error: message }, { status: 502 });
  }
}
