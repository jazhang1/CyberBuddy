import { redirect } from "next/navigation";

// Onboarding was merged into the Questions page. Kept as a redirect so old
// links/bookmarks still land somewhere useful.
export default function OnboardingPage() {
  redirect("/questions");
}
