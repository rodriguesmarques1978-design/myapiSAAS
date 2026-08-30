import { Features } from "@/components/features";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
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
          <Features />
          <HowItWorks />
        </main>
        <SiteFooter />
      </div>
    </WaitlistProvider>
  );
}
