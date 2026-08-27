// Redirects the browser to a fresh Stripe Billing Portal session for the
// signed-in user. Shared by the navbar and the schedule page so neither
// duplicates the fetch/redirect logic.
export async function openBillingPortal(): Promise<string | null> {
  const res = await fetch("/api/stripe/portal", { method: "POST" });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.url) {
    return data?.error ?? "Failed to open billing portal.";
  }

  window.location.href = data.url;
  return null;
}
