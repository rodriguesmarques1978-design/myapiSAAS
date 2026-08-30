import {
  ChartColumn,
  CreditCard,
  KeyRound,
  Plug,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: KeyRound,
    title: "Instant API keys",
    description:
      "Issue, scope, rotate, and revoke keys from the dashboard or the API. Hashed at rest, never stored in plaintext.",
  },
  {
    icon: Timer,
    title: "Sliding-window rate limiting",
    description:
      "Limits per key, per endpoint, or per IP — with the standard x-ratelimit headers your customers already expect.",
  },
  {
    icon: ChartColumn,
    title: "Real-time analytics",
    description:
      "Requests, latency, error rates, and top consumers. See what broke and who was calling, without adding logging.",
  },
  {
    icon: CreditCard,
    title: "Metered billing",
    description:
      "Usage flows straight into Stripe. Charge per request, per token, or per any unit you report — no reconciliation.",
  },
  {
    icon: Zap,
    title: "Edge-fast proxy",
    description:
      "The gateway runs close to your users, so the routing hop stays in single-digit milliseconds on top of your API.",
  },
  {
    icon: Plug,
    title: "Drop-in, framework-agnostic",
    description:
      "It's plain HTTP in front of plain HTTP. Next.js, FastAPI, Rails, Go — if it serves requests, it works.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl scroll-mt-14 px-6 py-20 sm:py-24"
    >
      <div className="max-w-2xl">
        <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Everything the plumbing needs to be
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          One gateway, four problems solved, nothing to maintain.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="group rounded-xl border border-border/70 bg-card p-6 transition-colors hover:border-border hover:bg-muted/30"
          >
            <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-muted/50 transition-colors group-hover:bg-muted">
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
