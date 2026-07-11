import type { Metadata } from "next";
import Link from "next/link";
import { PublicRegistrationPanel } from "@/components/public/public-registration-panel";
import { formatDateTime } from "@/lib/format/date";
import { absoluteUrl, buildSocialMetadata } from "@/lib/metadata";
import { getLocationName, getOrganizationForPublic, getProgramPricing, getPublicProgram, getPublicSessionsForProgram, getSessionStats } from "@/lib/public-programs";

export async function generateMetadata({
  params
}: {
  params: Promise<{ orgSlug: string; programId: string }>;
}): Promise<Metadata> {
  const { orgSlug, programId } = await params;
  const org = getOrganizationForPublic(orgSlug);
  const program = getPublicProgram(orgSlug, programId);
  const orgName = org?.name ?? "Cairn";
  const title = `${program?.title ?? "Program"} | ${orgName}`;
  const description = program?.description ?? `Browse schedules and register for ${program?.title ?? "this program"} at ${orgName}.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/p/${orgSlug}/programs/${programId}`) },
    ...buildSocialMetadata({ title, description, url: absoluteUrl(`/p/${orgSlug}/programs/${programId}`) }),
    robots: { index: true, follow: true }
  };
}

export default async function PublicProgramDetailPage({
  params
}: {
  params: Promise<{ orgSlug: string; programId: string }>;
}) {
  const { orgSlug, programId } = await params;
  const org = getOrganizationForPublic(orgSlug);
  const program = getPublicProgram(orgSlug, programId);

  if (!org || !program) {
    return <section className="mx-auto max-w-6xl p-6"><p className="text-sm text-muted-foreground">Program not found.</p></section>;
  }

  const sessions = getPublicSessionsForProgram(orgSlug, program.id);
  const pricing = getProgramPricing(program);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: program.title,
    description: program.description,
    provider: {
      "@type": "Organization",
      name: org.name
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="rounded-xl border bg-card p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{org.name}</p>
        <h1 className="text-2xl font-semibold">{program.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{program.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border px-2 py-1">Category: {program.category}</span>
          <span className="rounded-full border px-2 py-1">Age: {program.minimumAge ?? "All"}{program.maximumAge ? `-${program.maximumAge}` : "+"}</span>
          <span className="rounded-full border px-2 py-1">Instructor: {sessions[0]?.instructorName ?? "To be assigned"}</span>
          <span className="rounded-full border px-2 py-1">Member: {pricing.memberCents !== null ? `$${(pricing.memberCents / 100).toFixed(2)}` : "Pricing pending"}</span>
          <span className="rounded-full border px-2 py-1">Non-member: {pricing.nonMemberCents !== null ? `$${(pricing.nonMemberCents / 100).toFixed(2)}` : "Pricing pending"}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Required waivers: {program.requiredWaiverTemplateIds?.length ? "Required" : "None"} • Membership requirement: {program.memberRequired ? "Member required" : "Open"}</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <article className="rounded-xl border bg-card p-4">
          <h2 className="text-lg font-semibold">Upcoming Sessions</h2>
          <div className="mt-3 space-y-3">
            {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No sessions scheduled yet.</p> : null}
            {sessions.map((session) => {
              const stats = getSessionStats(session);
              return (
                <div key={session.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{session.title?.trim() || program.title}</p>
                      <p className="text-sm text-muted-foreground">{formatDateTime(session.startsAt)} • {getLocationName(session.locationId)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{stats.registered}/{session.capacity} registered</p>
                      <p className="text-muted-foreground">{stats.waitlisted} waitlisted</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link href={`/p/${orgSlug}/sessions/${session.id}`} className="inline-flex h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
                      {stats.full ? "Join Waitlist" : "Register"}
                    </Link>
                    <Link href={`/p/${orgSlug}/sessions/${session.id}`} className="inline-flex h-10 items-center rounded-md border border-input px-3 text-sm">
                      View Session
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
        <aside className="space-y-3">
          {sessions[0] ? <PublicRegistrationPanel orgSlug={orgSlug} program={program} session={sessions[0]} /> : null}
          <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            Photos and instructor bios are planned for a future phase.
          </div>
        </aside>
      </section>
    </main>
  );
}
