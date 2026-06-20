import type { Metadata } from "next";
import Link from "next/link";
import { CairnBrand } from "@/components/brand/cairn-brand";
import { getOrganizationForPublic, getPublicPrograms } from "@/lib/public-programs";
import { RuntimeFacilityLanding } from "@/components/public/runtime-facility-landing";
import { data } from "@/lib/data";
import { buildSocialMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const org = getOrganizationForPublic(orgSlug);
  const orgName = org?.name ?? "Cairn Facility";
  const title = `${orgName} | Facility Portal`;
  const description = `Explore ${orgName} programs, memberships, and customer portal access.`;

  return {
    title,
    description,
    alternates: { canonical: `https://cairn.example.com/f/${orgSlug}` },
    ...buildSocialMetadata({ title, description, url: `https://cairn.example.com/f/${orgSlug}` }),
    robots: { index: true, follow: true }
  };
}

export default async function FacilityLandingPage({
  params
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = getOrganizationForPublic(orgSlug);

  if (!org) {
    return <RuntimeFacilityLanding orgSlug={orgSlug} />;
  }

  const orgLocations = (data.locations ?? []).filter((entry) => entry.organizationId === org.id && entry.active !== false);
  const featuredPrograms = getPublicPrograms(orgSlug).slice(0, 3);
  const primaryLocation = orgLocations[0];
  const contactEmail = org.slug === "summit" ? "ops@summitrec.co" : "hello@riverbendrec.co";
  const contactPhone = primaryLocation?.phone ?? "(212) 555-1000";
  const brandPrimary = org.slug === "summit" ? "#0E9AC8" : "#2563EB";
  const brandSecondary = org.slug === "summit" ? "#1F2937" : "#1E3A8A";

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
            Public facility entry for programs, memberships, waivers, and customer access.
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
              <dd className="font-medium">{primaryLocation?.name ?? "Main location"}</dd>
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

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Locations</h2>
            <div className="mt-3 space-y-3">
              {orgLocations.map((location) => (
                <div key={location.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium">{location.name}</p>
                  <p className="text-slate-600">
                    {location.addressLine1}, {location.city}, {location.state}
                  </p>
                  <p className="text-slate-600">{location.phone}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Upcoming Programs</h2>
            <div className="mt-3 space-y-3">
              {featuredPrograms.length === 0 ? (
                <p className="text-sm text-slate-600">No published programs yet.</p>
              ) : (
                featuredPrograms.map((program) => (
                  <div key={program.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-medium">{program.title}</p>
                    <p className="text-slate-600">{program.description}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
