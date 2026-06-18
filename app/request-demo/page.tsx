import type { Metadata } from "next";
import { CairnBrand } from "@/components/brand/cairn-brand";

export const metadata: Metadata = {
  title: "Request Live Demo | Cairn",
  description: "Request a live walkthrough of Cairn facility operations software."
};

export default function RequestDemoPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-14 md:px-10">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <CairnBrand variant="wordmark" className="mb-5 h-12 w-auto" />
        <h1 className="text-3xl font-semibold">Request Live Demo</h1>
        <p className="mt-3 text-sm text-slate-600">
          Share your details and we will schedule a live walkthrough of Cairn for your facility team.
        </p>

        <form className="mt-6 grid gap-4 md:grid-cols-2" action="mailto:hello@stonecairn.app" method="post" encType="text/plain">
          <label className="space-y-1">
            <span className="text-sm font-medium">Name</span>
            <input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" name="name" type="text" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Email</span>
            <input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" name="email" type="email" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Organization</span>
            <input className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" name="organization" type="text" />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Facility Type</span>
            <select className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" name="facilityType" defaultValue="">
              <option value="" disabled>Select facility type</option>
              <option value="climbing">Climbing Gym</option>
              <option value="community">Community Center</option>
              <option value="bike">Bike Park</option>
              <option value="adventure">Adventure Facility</option>
              <option value="camp">Camp</option>
              <option value="fitness">Fitness Center</option>
              <option value="hybrid">Multi-use Facility</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium">Message</span>
            <textarea className="min-h-28 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" name="message" />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Request Demo
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              This opens an email to Stone Cairn so we can schedule a live walkthrough.
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}
