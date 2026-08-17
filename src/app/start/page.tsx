import Link from "next/link";

export default function StartPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Coming soon</h1>
      <p className="max-w-sm text-muted-foreground">
        The 3-question first-step generator lives here next.
      </p>
      <Link
        href="/"
        className="text-sm underline underline-offset-4 hover:text-foreground"
      >
        Back home
      </Link>
    </main>
  );
}
