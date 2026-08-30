"use client";

import * as React from "react";

import { CodeBlock } from "@/components/ui/code-block";
import type { CodeLang } from "@/lib/highlight";
import { cn } from "@/lib/utils";

const tabs: {
  id: string;
  label: string;
  filename: string;
  lang: CodeLang;
  code: string;
}[] = [
  {
    id: "issue",
    label: "Issue a key",
    filename: "server.ts",
    lang: "ts",
    code: `// Cria uma chave para um cliente novo, com o plano dele.
const res = await fetch("https://api.myapi.dev/v1/keys", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.MYAPI_SECRET}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "acme-production",
    plan: "growth",
    rateLimit: { requests: 1000, window: "1m" },
  }),
});

const { key } = await res.json();
// sk_live_8f2c… — mostra-a uma vez, nós só guardamos o hash.`,
  },
  {
    id: "call",
    label: "Customer calls your API",
    filename: "Terminal",
    lang: "bash",
    code: `curl https://gw.myapi.dev/acme/v1/summarize \\
  -H "Authorization: Bearer sk_live_8f2c…" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "long document to summarize"}'

# HTTP/2 200
# x-ratelimit-limit: 1000
# x-ratelimit-remaining: 993
# x-ratelimit-reset: 1735689600`,
  },
  {
    id: "usage",
    label: "Read usage",
    filename: "GET /v1/usage",
    lang: "json",
    code: `{
  "period": "2026-08",
  "total_requests": 128430,
  "billable_units": 128430,
  "top_keys": [
    { "name": "acme-production", "requests": 98204, "errors": 12 },
    { "name": "acme-staging", "requests": 30226, "errors": 3 }
  ],
  "p95_latency_ms": 214,
  "synced_to_stripe": true
}`,
  },
];

export function CodeShowcase() {
  const [active, setActive] = React.useState(tabs[0].id);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <section className="border-y border-border/60 bg-muted/20">
      <div className="mx-auto max-w-4xl px-6 py-20 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            The whole integration, end to end
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Three calls. That&apos;s the entire surface area you have to learn.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Integration examples"
          className="mt-10 flex flex-wrap gap-1 rounded-lg border border-border/70 bg-background/60 p-1"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === active}
              onClick={() => setActive(item.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                item.id === active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <CodeBlock
          key={tab.id}
          className="mt-4 bg-background/60"
          code={tab.code}
          lang={tab.lang}
          filename={tab.filename}
        />
      </div>
    </section>
  );
}
