import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { WaitlistButton } from "@/components/waitlist";

const before = `# Your API today — open to anyone who finds the URL
curl https://api.yourapp.com/v1/summarize \\
  -d '{"text": "..."}'

# No keys. No limits. No idea who is calling.`;

const after = `# Behind myapi — keyed, limited, metered
curl https://gw.myapi.dev/acme/v1/summarize \\
  -H "Authorization: Bearer sk_live_8f2c…" \\
  -d '{"text": "..."}'

# 200 OK  ·  x-ratelimit-remaining: 4931`;

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

          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Ship your API without building the boring parts
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            API keys, rate limiting, usage analytics, and metered billing — in
            one drop-in gateway. Point it at your API and you&apos;re protected
            in 5 minutes.
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
        </div>

        {/* Antes → depois: a mesma chamada, com e sem gateway. */}
        <div className="mt-16 grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <CodeBlock code={before} lang="bash" filename="Without myapi" />

          <div className="flex justify-center text-muted-foreground">
            <ArrowRight className="hidden h-5 w-5 lg:block" />
            <ArrowDown className="h-5 w-5 lg:hidden" />
          </div>

          <CodeBlock code={after} lang="bash" filename="With myapi" />
        </div>
      </div>
    </section>
  );
}
