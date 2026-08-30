import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WaitlistButton } from "@/components/waitlist";

// A dor à esquerda, o alívio à direita. Mesma altura de leitura, tom oposto.
const withoutMyapi = [
  "Build API key management",
  "Set up Redis rate limiting",
  "Wire Stripe metering",
  "Build usage dashboards",
  "Weeks of work",
];

const withMyapi = [
  "One URL in front of your API",
  "Keys, limits, billing included",
  "Real-time analytics",
  "Live in 5 minutes",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* Grid subtil, esbatido nas bordas com uma máscara radial. */}
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black,transparent)]"
      />

      <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="text-center">
          <Badge
            variant="outline"
            className="mb-6 rounded-full border-border/80 bg-muted/40 px-3 py-1 font-normal text-muted-foreground backdrop-blur"
          >
            Now in early access
          </Badge>

          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Skip the boring parts of shipping an API
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Keys, rate limits, and billing — without writing any of it. Point
            myapi at your endpoint and ship in 5 minutes.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <WaitlistButton size="lg" className="w-full sm:w-auto">
              Get early access
              <ArrowRight className="h-4 w-4" />
            </WaitlistButton>

            <Button
              asChild
              size="lg"
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground sm:w-auto"
            >
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Free tier at launch · No credit card
          </p>
        </div>

        {/* Problema → solução, lado a lado. Empilha no mobile. */}
        <div className="mx-auto mt-16 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-6">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <X className="h-4 w-4 text-red-500/70" />
              Without myapi
            </h2>

            <ul className="mt-5 space-y-3">
              {withoutMyapi.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 font-mono text-[13px] leading-relaxed text-muted-foreground/70"
                >
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500/50" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              With myapi
            </h2>

            <ul className="mt-5 space-y-3">
              {withMyapi.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 font-mono text-[13px] leading-relaxed text-foreground/90"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
