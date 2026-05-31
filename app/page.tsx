import type { Metadata } from "next";
import Link from "next/link";
import { PublicAnalytics } from "@/components/public/public-analytics";

export const metadata: Metadata = {
  title: "Cairn | Facility Operations Software",
  description:
    "Modern facility operations software for recreation, wellness, camps, memberships, check-ins, POS, programs, and reporting.",
  alternates: {
    canonical: "https://cairn.example.com/"
  },
  openGraph: {
    title: "Cairn | Facility Operations Software",
    description:
      "Modern facility operations software for recreation, wellness, camps, memberships, check-ins, POS, programs, and reporting.",
    url: "https://cairn.example.com/",
    siteName: "Cairn",
    images: [{ url: "https://cairn.example.com/og-image-placeholder.png", width: 1200, height: 630 }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Cairn | Facility Operations Software",
    description:
      "Modern facility operations software for recreation, wellness, camps, memberships, check-ins, POS, programs, and reporting.",
    images: ["https://cairn.example.com/og-image-placeholder.png"]
  }
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
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <PublicAnalytics />
      <main className="mx-auto max-w-6xl space-y-16 px-6 py-14 md:px-10">
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-12">
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
            Modern facility operations software for recreation, wellness, and outdoor programs.
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600 md:text-lg">
            Cairn helps teams manage customers, check-ins, memberships, programs, POS, waivers, households, staff, and reports from one web-based system.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Log In
            </Link>
            <button type="button" className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Request Demo
            </button>
          </div>
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

        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-10">
          <h2 className="text-2xl font-semibold">Ready to run your facility with Cairn?</h2>
          <div className="mt-5">
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Log In to Cairn
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
