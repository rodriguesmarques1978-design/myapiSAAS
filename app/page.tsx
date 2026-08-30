import { CodeShowcase } from "@/components/code-showcase";
import { CtaWaitlist } from "@/components/cta-waitlist";
import { Faq } from "@/components/faq";
import { Features } from "@/components/features";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Pricing } from "@/components/pricing";
import { Problem } from "@/components/problem";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WaitlistProvider } from "@/components/waitlist";

export default function Home() {
  return (
    // O provider envolve a página para que qualquer CTA abra o mesmo modal.
    <WaitlistProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Hero />
          <Problem />
          <HowItWorks />
          <Features />
          <CodeShowcase />
          <Pricing />
          <Faq />
          <CtaWaitlist />
        </main>
        <SiteFooter />
      </div>
    </WaitlistProvider>
  );
}
