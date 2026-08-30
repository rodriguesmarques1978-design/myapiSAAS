import { WaitlistForm } from "@/components/waitlist-form";

export function CtaWaitlist() {
  return (
    <section id="waitlist" className="scroll-mt-14">
      <div className="mx-auto max-w-2xl px-6 py-20 text-center sm:py-24">
        <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Get early access
        </h2>
        <p className="mt-3 text-balance text-sm text-muted-foreground sm:text-base">
          We&apos;re onboarding indie developers in small waves. Tell us what
          you&apos;re building and we&apos;ll fit the gateway around it — and
          around the pricing you&apos;d actually pay.
        </p>

        <WaitlistForm
          idPrefix="cta"
          className="mt-10 text-left"
          ctaLabel="Join the waitlist"
        />
      </div>
    </section>
  );
}
