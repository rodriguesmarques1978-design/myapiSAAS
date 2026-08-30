const steps = [
  {
    title: "Point to your API",
    description: "Tell us your origin URL. No SDK, no code changes.",
  },
  {
    title: "Get your gateway URL",
    description: "Ship it to your users instead of the raw endpoint.",
  },
  {
    title: "You're protected",
    description: "Keys, limits, and usage tracked from the first request.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-14 border-y border-border/60 bg-muted/20"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Three steps, about five minutes.
        </p>

        <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, index) => (
            <li key={step.title} className="relative sm:pr-6">
              <span className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="mt-3 h-px w-full bg-border" />
              <h3 className="mt-4 text-sm font-medium">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
