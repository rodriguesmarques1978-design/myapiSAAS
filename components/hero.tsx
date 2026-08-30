import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WaitlistButton } from "@/components/waitlist";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* Grid subtil, esbatido nas bordas com uma máscara radial. */}
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,black,transparent)]"
      />

      <div className="relative mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
        <Badge
          variant="outline"
          className="mb-6 rounded-full border-border/80 bg-muted/40 px-3 py-1 font-normal text-muted-foreground backdrop-blur"
        >
          🚀 Coming soon
        </Badge>

        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          API infrastructure for indie developers
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
          Rate limits, API keys, and metered billing in 5 minutes. Zero setup,
          focus on shipping.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <WaitlistButton size="lg" className="w-full sm:w-auto">
            Get Early Access
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
      </div>
    </section>
  );
}
