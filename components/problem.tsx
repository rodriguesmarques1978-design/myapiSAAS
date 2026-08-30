import { BarChart3, CreditCard, KeyRound, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const pains: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: KeyRound,
    title: "API key management",
    description:
      "Issuing, hashing, rotating, and revoking keys is a week of auth work before a single customer can call you.",
  },
  {
    icon: ShieldAlert,
    title: "Rate limiting",
    description:
      "Without limits, one runaway loop or one abusive user can burn through your model budget overnight.",
  },
  {
    icon: BarChart3,
    title: "Usage tracking",
    description:
      "You can't answer “who called what, how often” unless you built request logging and aggregation on day one.",
  },
  {
    icon: CreditCard,
    title: "Metered billing",
    description:
      "Charging per request means metering, aggregating, and reconciling with Stripe. None of that is your product.",
  },
];

export function Problem() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="max-w-2xl">
        <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Every API needs the same plumbing
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          You wanted to build the thing your customers pay for. Instead you
          spend the first month rebuilding infrastructure that every other API
          already has.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {pains.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-border/70 bg-card p-6"
          >
            <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-muted/50">
              <Icon className="h-[18px] w-[18px] text-foreground/80" />
            </div>
            <h3 className="text-sm font-medium">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
