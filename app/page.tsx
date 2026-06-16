import type { Metadata } from "next";
import Link from "next/link";
import { CairnBrand } from "@/components/brand/cairn-brand";
import { PublicAnalytics } from "@/components/public/public-analytics";
import { cairnPricingPlans, cairnSupportTiers, pricingPrinciples } from "@/lib/business-model";
import { SITE_URL, buildSocialMetadata } from "@/lib/metadata";

const homeTitle = "Cairn | Facility Operations Software";
const homeDescription =
  "Modern facility operations software for recreation, wellness, camps, memberships, check-ins, POS, programs, and reporting.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: SITE_URL
  },
  ...buildSocialMetadata({ title: homeTitle, description: homeDescription, url: SITE_URL })
};

const features = [
  "Fast front desk check-in",
  "Customer and household management",
  "Memberships, passes, and access rules",
  "POS and retail-ready products",
  "Programs, calendar, registrations, and attendance",
  "Staff roles and permissions",
  "Reports and operational insights",
  "Multi-location support"
];

const audiences = [
  "Recreation centers",
  "Wellness spaces",
  "Camps",
  "Fitness facilities",
  "Outdoor programs",
  "Community-based facilities"
];

export default function HomePage() {
  const pricingPlans = Object.values(cairnPricingPlans).filter((plan) => plan.key !== "enterprise");
  const supportTiers = Object.values(cairnSupportTiers);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <PublicAnalytics />
      <main className="mx-auto max-w-6xl space-y-16 px-6 py-14 md:px-10">
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-12">
          <CairnBrand variant="wordmark" className="h-16 w-auto" />
          <h1 className="sr-only">Cairn</h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600 md:text-lg">
            Modern facility operations software for recreation centers, climbing gyms, camps, and community organizations.
          </p>
          <p className="mt-3 max-w-3xl text-base text-slate-600">
            Cairn helps teams manage customers, check-ins, memberships, programs, POS, waivers, households, staff, and reports from one web-based system.
          </p>
        </section>

        <section aria-label="Feature highlights" className="space-y-4">
          <h2 className="text-2xl font-semibold">Built for daily operations</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {features.map((feature) => (
              <article key={feature} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium">{feature}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Product preview" className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h2 className="text-2xl font-semibold">One workspace for the front desk and operations team</h2>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Check-in</p>
                <p className="mt-2 text-sm font-medium">Real-time readiness, access warnings, and household-aware entry flow.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Programs</p>
                <p className="mt-2 text-sm font-medium">Visual scheduling, registrations, waitlists, and attendance tracking.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">POS</p>
                <p className="mt-2 text-sm font-medium">Memberships, passes, retail, receipts, and household assignment.</p>
              </div>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Operational snapshot</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-sky-50 p-4">
                <p className="text-sm font-medium">Currently checked in</p>
                <p className="mt-1 text-3xl font-semibold text-sky-700">24</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Programs today</p>
                  <p className="mt-2 text-lg font-semibold">8 sessions</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Waivers needing follow-up</p>
                  <p className="mt-2 text-lg font-semibold">3 records</p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section aria-label="Who uses Cairn" className="space-y-4">
          <h2 className="text-2xl font-semibold">Who it is for</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {audiences.map((audience) => (
              <article key={audience} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium">{audience}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" aria-label="Pricing" className="space-y-5">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold">Simple pricing that grows with your organization.</h2>
            <p className="mt-2 text-slate-600">
              Cairn charges by facility, not by staff accounts, customers, households, or transactions. Every organization receives the complete Cairn experience.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article key={plan.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-lg font-semibold">{plan.name}</p>
                <p className="mt-2 text-sm text-slate-600">{plan.summary}</p>
                <div className="mt-4 space-y-1">
                  <p className="text-2xl font-semibold">{plan.monthlyPrice}</p>
                  <p className="text-sm text-slate-600">{plan.annualPrice}</p>
                  <p className="text-xs font-medium text-emerald-700">{plan.annualNote}</p>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {plan.includes.map((item) => (
                    <li key={item} className="flex gap-2"><span aria-hidden="true">✓</span><span>{item}</span></li>
                  ))}
                </ul>
              </article>
            ))}
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-lg font-semibold">Larger Organizations</p>
              <p className="mt-2 text-sm text-slate-600">Need support for a larger organization? Let&apos;s talk.</p>
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                We can discuss multi-site rollout, onboarding, migration assistance, staff training, and implementation planning.
              </div>
              <a href="mailto:hello@stonecairn.app" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">
                Contact Us
              </a>
            </article>
          </div>
        </section>

        <section aria-label="Pricing philosophy" className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold">What we don’t charge for.</h2>
            <p className="mt-2 text-slate-600">
              We believe software should support thriving communities, not penalize organizations for growing.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pricingPrinciples.map((principle) => (
              <div key={principle} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium">
                ✓ {principle}
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Support levels" className="space-y-5">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold">Support that matches the relationship.</h2>
            <p className="mt-2 text-slate-600">Support tiers affect response expectations and operational partnership. They do not restrict product access.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {supportTiers.map((tier) => (
              <article key={tier.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="font-semibold">{tier.name}</p>
                <p className="mt-2 text-lg font-semibold">{tier.price}</p>
                <p className="mt-1 text-sm text-slate-600">Target response: {tier.responseTarget}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {tier.includes.map((item) => <li key={item}>✓ {item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Free trial" className="rounded-2xl border border-slate-200 bg-sky-50 p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-semibold">30-day trial. No credit card required.</h2>
          <p className="mt-2 max-w-3xl text-slate-700">Experience the complete Cairn platform before making a decision. Trial organizations receive full product access with no feature restrictions.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/request-demo?intent=trial" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Start Free Trial
            </Link>
            <Link href="/request-demo" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Request Live Demo
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-10">
          <h2 className="text-2xl font-semibold">Ready to run your facility with Cairn?</h2>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/f/summit" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Explore Demo Facility
            </Link>
            <a href="mailto:support@stonecairn.app" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Contact Us
            </a>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-8 text-sm text-slate-600 md:grid-cols-[1fr_auto] md:px-10">
          <div>
            <CairnBrand variant="wordmark" className="h-10 w-auto" />
            <p className="mt-3 text-slate-700">The operating system for modern recreation facilities.</p>
            <p className="mt-1 text-xs text-slate-500">Built by Argon Collective LLC.</p>
            <p className="mt-2">© 2026 Argon Collective LLC</p>
          </div>
          <nav className="flex flex-wrap gap-4">
            <Link href="/docs" className="hover:text-slate-900">Documentation</Link>
            <a href="mailto:support@stonecairn.app" className="hover:text-slate-900">Support</a>
            <a href="mailto:hello@stonecairn.app" className="hover:text-slate-900">Contact</a>
            <Link href="/legal" className="hover:text-slate-900">Legal</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
