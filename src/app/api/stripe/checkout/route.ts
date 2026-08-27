import { env } from "~/env";
import { stripe } from "~/lib/stripe";
import { createClient } from "~/lib/supabase/server";

// Creates a Stripe Checkout Session for the $8/month schedule subscription.
// The client redirects the browser to the returned url; Stripe hosts the
// actual payment form, so no card data ever touches this app.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}/schedule?checkout=success`,
      cancel_url: `${origin}/schedule?checkout=cancel`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start checkout.";
    return Response.json({ error: message }, { status: 502 });
  }
}
