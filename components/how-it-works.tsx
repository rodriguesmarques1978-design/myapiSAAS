import { CodeBlock } from "@/components/ui/code-block";
import type { CodeLang } from "@/lib/highlight";

const steps: {
  title: string;
  description: string;
  code: string;
  lang: CodeLang;
  filename: string;
}[] = [
  {
    title: "Point it at your API",
    description:
      "One command. No SDK to install, no code changes in your service.",
    code: `npx myapi init \\
  --name acme \\
  --origin https://api.yourapp.com`,
    lang: "bash",
    filename: "Terminal",
  },
  {
    title: "Get your gateway URL",
    description:
      "Give this URL to your customers instead of your raw endpoint.",
    code: `{
  "gateway": "https://gw.myapi.dev/acme",
  "origin": "https://api.yourapp.com",
  "status": "live"
}`,
    lang: "json",
    filename: "Response",
  },
  {
    title: "Your customers use it",
    description:
      "Keys, limits, and usage are enforced and tracked from the first request.",
    code: `curl https://gw.myapi.dev/acme/v1/summarize \\
  -H "Authorization: Bearer sk_live_8f2c…"`,
    lang: "bash",
    filename: "Customer request",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-14 border-y border-border/60 bg-muted/20"
    >
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="max-w-2xl">
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Three steps, about five minutes.
          </p>
        </div>

        <ol className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-6">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col">
              <span className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="mt-3 h-px w-full bg-border" />
              <h3 className="mt-4 text-sm font-medium">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              <CodeBlock
                className="mt-5 bg-background/60"
                code={step.code}
                lang={step.lang}
                filename={step.filename}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
