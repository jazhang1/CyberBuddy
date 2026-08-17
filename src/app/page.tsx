import Link from "next/link";
import { Button } from "~/components/ui/button";

const steps = [
  {
    title: "Answer 3 questions",
    description: "No jargon. Just where you're starting from.",
  },
  {
    title: "Get your first-step list",
    description: "A short, clear list you could start tonight.",
  },
  {
    title: "Edit it until it's yours",
    description: "Tweak, remove, or reorder — then review and save.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <section className="border-b border-border bg-gradient-to-b from-muted/60 to-background px-6 py-24 sm:py-28">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            No Experience Needed
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            From zero to cyber, one clear step at a time.
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Cybersecurity can feel like an overwhelming field with no clear
            entry point. CyberBuddy asks a few quick questions and hands you a
            short, doable list of first steps — no experience required.
          </p>
          <div className="mt-2 flex items-center gap-5">
            <Button size="lg" asChild>
              <Link href="/start">Get my first steps</Link>
            </Button>
            <Link
              href="#how-it-works"
              className="text-sm font-medium underline underline-offset-4 hover:text-foreground"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-8 px-6 py-16 sm:grid-cols-3"
      >
        {steps.map((step) => (
          <div key={step.title} className="flex flex-col gap-1.5">
            <p className="font-semibold">{step.title}</p>
            <p className="text-sm text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
