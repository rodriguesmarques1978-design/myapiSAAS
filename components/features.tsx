import { ChartColumn, KeyRound, Zap, type LucideIcon } from "lucide-react";

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: KeyRound,
    title: "Instant API Keys",
    description: "Generate, rotate, and revoke with one click",
  },
  {
    icon: Zap,
    title: "Smart Rate Limiting",
    description: "Sliding window per key, endpoint, or IP",
  },
  {
    icon: ChartColumn,
    title: "Usage Analytics",
    description: "See who uses your API, how much, when",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl scroll-mt-14 px-6 py-20 sm:py-24"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="group rounded-xl border border-border/70 bg-card p-6 transition-colors hover:border-border hover:bg-muted/30"
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
