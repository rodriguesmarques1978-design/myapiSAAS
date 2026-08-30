import { ChevronDown } from "lucide-react";

const faqs: { question: string; answer: string }[] = [
  {
    question: "How much latency does the gateway add?",
    answer:
      "The gateway runs at the edge and does key lookup, limit checks, and metering in memory, so the target is a single-digit millisecond hop on top of your own response time. We'll publish measured p50/p95 numbers before general availability rather than ask you to take a number on faith.",
  },
  {
    question: "What happens if myapi goes down?",
    answer:
      "You choose. Fail-closed rejects requests when the gateway can't verify a key, which is the safe default for paid APIs. Fail-open passes traffic straight through to your origin unmetered, so an outage on our side never takes your product down with it.",
  },
  {
    question: "Do I have to change my existing API?",
    answer:
      "No. myapi sits in front of whatever you already run and forwards requests unchanged — same paths, same headers, same bodies. You point it at your origin URL and hand your customers the gateway URL instead. Nothing inside your service has to know we exist.",
  },
  {
    question: "Which languages and frameworks are supported?",
    answer:
      "All of them. The gateway speaks plain HTTP to plain HTTP, so anything that serves requests works — Next.js, Express, FastAPI, Django, Rails, Go, Elixir, a Lambda behind a URL. There's no SDK to install and no runtime to match.",
  },
  {
    question: "Is my data safe?",
    answer:
      "We proxy request bodies without storing them. What we keep is metadata: which key was used, which endpoint, status code, latency, and byte counts — the fields that make analytics and billing work. API keys are hashed at rest, and everything is encrypted in transit.",
  },
  {
    question: "When does it launch?",
    answer:
      "Early access is rolling out in small waves right now so we can fix things with real traffic before opening the doors. Join the waitlist and you'll get an invite as capacity opens up, plus a heads-up before we finalize pricing.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="scroll-mt-14 border-y border-border/60 bg-muted/20"
    >
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
        <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Frequently asked questions
        </h2>

        {/* <details> nativo: accordion acessível sem mais dependências. */}
        <div className="mt-10 divide-y divide-border/60 border-y border-border/60">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium marker:content-none">
                {faq.question}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
