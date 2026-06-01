import type { Metadata } from "next";
import Link from "next/link";
import { getOrganizationForPublic, getPublicPrograms } from "@/lib/public-programs";
import { data } from "@/lib/data";

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
    openGraph: { title, description },
    twitter: { card: "summary_large_image", title, description },
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
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Facility not found</h1>
      </main>
    );
  }

  const orgLocations = (data.locations ?? []).filter((entry) => entry.organizationId === org.id && entry.active !== false);
  const featuredPrograms = getPublicPrograms(orgSlug).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <main className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <p className="text-xs uppercase tracking-wide text-slate-500">Facility Portal</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{org.name}</h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            Public facility entry for programs, memberships, waivers, and customer access.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/p/${orgSlug}/login`} className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Customer Login
            </Link>
            <Link href={`/o/${orgSlug}/login`} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Staff Login
            </Link>
            <Link href={`/p/${orgSlug}/programs`} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Program Catalog
            </Link>
            <Link href={`/p/${orgSlug}/waivers`} className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">
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
