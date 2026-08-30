import { Check, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { WaitlistButton } from "@/components/waitlist";
import { cn } from "@/lib/utils";

const tiers: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  popular?: boolean;
}[] = [
  {
    name: "Free",
    price: "€0",
    tagline: "For the weekend build.",
    features: [
      "10k requests / month",
      "3 API keys",
      "7-day analytics retention",
      "Community support",
    ],
  },
  {
    name: "Starter",
    price: "€29",
    tagline: "For your first paying customers.",
    features: [
      "250k requests / month",
      "Unlimited API keys",
      "30-day analytics retention",
      "Custom rate limits per key",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "€99",
    tagline: "For when usage becomes revenue.",
    popular: true,
    features: [
      "2M requests / month",
      "Metered billing via Stripe",
      "90-day analytics retention",
      "Usage webhooks",
      "Priority support",
    ],
  },
  {
    name: "Scale",
    price: "€299",
    tagline: "For APIs other companies depend on.",
    features: [
      "10M requests / month",
      "Custom domains",
      "SSO for your team",
      "1-year analytics retention",
      "99.9% uptime SLA",
      "Shared Slack channel",
    ],
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="mx-auto max-w-6xl scroll-mt-14 px-6 py-20 sm:py-24"
    >
      <div className="max-w-2xl">
        <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Pricing
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Start free. Move up a tier when your usage — and your revenue — says
          you should.
        </p>
      </div>

      {/* Aviso honesto: os preços ainda não estão fechados. */}
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm leading-relaxed">
          <span className="font-medium">
            These are early-access prices, and they will change.
          </span>{" "}
          <span className="text-muted-foreground">
            Nothing here is locked in — we&apos;re still setting the tiers and
            limits with feedback from the first users. Join the waitlist and you
            help decide what they end up being, and you keep early pricing for
            as long as you stay.
          </span>
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "relative flex flex-col rounded-xl border bg-card p-6",
              tier.popular
                ? "border-foreground/30 shadow-sm"
                : "border-border/70",
            )}
          >
            {tier.popular ? (
              <Badge className="absolute -top-2.5 left-6 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wide">
                Most popular
              </Badge>
            ) : null}

            <h3 className="text-sm font-medium">{tier.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{tier.tagline}</p>

            <p className="mt-5 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-semibold tracking-tight">
                {tier.price}
              </span>
              <span className="text-xs text-muted-foreground">/ month</span>
            </p>

            <ul className="mt-6 flex-1 space-y-2.5">
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="leading-relaxed text-muted-foreground">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <WaitlistButton
              className="mt-6 w-full"
              variant={tier.popular ? "default" : "outline"}
            >
              Get early access
            </WaitlistButton>
          </div>
        ))}
      </div>
    </section>
  );
}
