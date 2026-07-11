import type { Metadata } from "next";
import Link from "next/link";
import { PublicRegistrationPanel } from "@/components/public/public-registration-panel";
import { formatDate, formatTime } from "@/lib/format/date";
import { absoluteUrl, buildSocialMetadata } from "@/lib/metadata";
import { getLocationName, getOrganizationForPublic, getPublicSession, getSessionStats } from "@/lib/public-programs";

export async function generateMetadata({
  params
}: {
  params: Promise<{ orgSlug: string; sessionId: string }>;
}): Promise<Metadata> {
  const { orgSlug, sessionId } = await params;
  const org = getOrganizationForPublic(orgSlug);
  const session = getPublicSession(orgSlug, sessionId);
  const orgName = org?.name ?? "Cairn";
  const title = `${session?.program?.title ?? "Session"} | ${orgName}`;
  const description = session
    ? `${session.program?.title ?? "Session"} on ${formatDate(session.startsAt, "-", { dateStyle: "long" })} at ${orgName}.`
    : `View session details at ${orgName}.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/p/${orgSlug}/sessions/${sessionId}`) },
    ...buildSocialMetadata({ title, description, url: absoluteUrl(`/p/${orgSlug}/sessions/${sessionId}`) }),
    robots: { index: true, follow: true }
  };
}

export default async function PublicSessionDetailPage({
  params
}: {
  params: Promise<{ orgSlug: string; sessionId: string }>;
}) {
  const { orgSlug, sessionId } = await params;
  const org = getOrganizationForPublic(orgSlug);
  const session = getPublicSession(orgSlug, sessionId);

  if (!org || !session || !session.program) {
    return <section className="mx-auto max-w-6xl p-6"><p className="text-sm text-muted-foreground">Session not found.</p></section>;
  }

  const stats = getSessionStats(session);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: session.program.title,
    startDate: session.startsAt,
    endDate: session.endsAt,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    organizer: {
      "@type": "Organization",
      name: org.name
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <header className="rounded-xl border bg-card p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{org.name}</p>
        <h1 className="text-2xl font-semibold">{session.program.title}</h1>
        <p className="text-sm text-muted-foreground">{session.title?.trim() && session.title !== session.program.title ? session.title : "Session details"}</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border bg-card p-4">
          <h2 className="text-lg font-semibold">Session Information</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Date</dt><dd>{formatDate(session.startsAt, "-", { dateStyle: "full" })}</dd></div>
            <div><dt className="text-muted-foreground">Time</dt><dd>{formatTime(session.startsAt)} - {formatTime(session.endsAt)}</dd></div>
            <div><dt className="text-muted-foreground">Instructor</dt><dd>{session.instructorName ?? "To be assigned"}</dd></div>
            <div><dt className="text-muted-foreground">Location</dt><dd>{getLocationName(session.locationId)}</dd></div>
            <div><dt className="text-muted-foreground">Capacity</dt><dd>{session.capacity}</dd></div>
            <div><dt className="text-muted-foreground">Spots remaining</dt><dd>{stats.spotsRemaining}</dd></div>
          </dl>

          <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
            <p>Registration status: {stats.full ? "Session full" : "Open"}</p>
            <p>Waitlist status: {stats.full ? `${stats.waitlisted} currently waitlisted` : "Waitlist available when full"}</p>
          </div>

          <div className="mt-3 flex gap-2">
            <Link href={`/p/${orgSlug}/programs/${session.program.id}`} className="inline-flex h-10 items-center rounded-md border border-input px-3 text-sm">Back to Program</Link>
            <Link href={`/p/${orgSlug}/programs`} className="inline-flex h-10 items-center rounded-md border border-input px-3 text-sm">Browse all programs</Link>
          </div>
        </article>

        <PublicRegistrationPanel orgSlug={orgSlug} program={session.program} session={session} />
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">Registration confirmation includes</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Program and session details</li>
          <li>Instructor and location</li>
          <li>Registration ID</li>
          <li>Waitlist confirmation if full</li>
        </ul>
      </section>
    </main>
  );
}
