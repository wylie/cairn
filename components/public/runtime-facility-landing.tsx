"use client";

import Link from "next/link";
import { CairnBrand } from "@/components/brand/cairn-brand";
import { data } from "@/lib/data";
import { resolveRuntimeOrganizationBySlugClient } from "@/lib/platform-admin/registry";

export function RuntimeFacilityLanding({ orgSlug }: { orgSlug: string }) {
  const org = resolveRuntimeOrganizationBySlugClient(orgSlug);

  if (!org) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Facility not found</h1>
      </main>
    );
  }

  const orgLocations = (data.locations ?? []).filter((entry) => entry.organizationId === org.id && entry.active !== false);
  const primaryLocation = orgLocations[0];
  const contactEmail = org.seoDescription?.includes("@") ? org.seoDescription : org.ownerEmail ?? "hello@cairn.example.com";
  const contactPhone = primaryLocation?.phone ?? "(212) 555-1000";
  const brandPrimary = org.primaryColor ?? "#0E9AC8";
  const brandSecondary = org.secondaryColor ?? "#1F2937";

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <main className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <div className="flex items-center gap-2">
            <CairnBrand className="h-8 w-8" />
            <p className="text-xs uppercase tracking-wide text-slate-500">Facility Portal</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-semibold" style={{ color: brandPrimary }}>
              {org.name
                .split(" ")
                .slice(0, 2)
                .map((chunk) => chunk[0])
                .join("")}
            </div>
            <h1 className="text-3xl font-semibold md:text-4xl">{org.name}</h1>
          </div>
          <p className="mt-3 max-w-3xl text-slate-600">
            {org.description ?? "Public facility entry for programs, memberships, waivers, and customer access."}
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-2">
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium">{contactPhone}</dd>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium">{contactEmail}</dd>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <dt className="text-slate-500">Primary address</dt>
              <dd className="font-medium">{primaryLocation?.addressLine1 ?? "Address not listed"}</dd>
            </div>
            <div className="rounded-md border border-slate-200 p-2">
              <dt className="text-slate-500">Main location</dt>
              <dd className="font-medium">{primaryLocation?.name ?? org.primaryLocationName ?? "Main location"}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/p/${orgSlug}/login`} className="inline-flex min-h-11 items-center rounded-md px-5 text-sm font-medium text-white hover:opacity-90" style={{ backgroundColor: brandPrimary }}>
              Customer Login
            </Link>
            <Link href={`/o/${orgSlug}/login`} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-5 text-sm font-medium hover:bg-slate-50" style={{ color: brandSecondary }}>
              Staff Login
            </Link>
            <Link href={`/p/${orgSlug}/programs`} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-5 text-sm font-medium hover:bg-slate-50" style={{ color: brandSecondary }}>
              Program Catalog
            </Link>
            <Link href={`/p/${orgSlug}/waivers`} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-5 text-sm font-medium hover:bg-slate-50" style={{ color: brandSecondary }}>
              Sign Waiver
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
