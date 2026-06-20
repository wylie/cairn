import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { activeRelease, getReleaseAnchor, latestRelease, releaseNotes, type ReleaseNoteSection } from "@/lib/releases/release-notes";
import { cairnVersion } from "@/lib/version";

const sectionLabels: Record<ReleaseNoteSection, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
  knownIssues: "Known Issues"
};

const sectionTone: Record<ReleaseNoteSection, "default" | "success" | "warning" | "danger" | "muted"> = {
  new: "success",
  improved: "default",
  fixed: "muted",
  knownIssues: "warning"
};

function formatReleaseDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export default function ReleaseNotesPage() {
  return (
    <section className="space-y-4">
      <PageHeader
        title="Release Notes"
        description="Product updates, fixes, known issues, and what is planned as Cairn moves through pilot testing."
        actions={<Badge tone="warning">v{cairnVersion.version} · {activeRelease.status}</Badge>}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Version</p>
            <p className="font-semibold">v{cairnVersion.version}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="font-semibold">{activeRelease.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Target release date</p>
            <p className="font-semibold">{cairnVersion.targetDate}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">v{activeRelease.version}</Badge>
            <Badge tone="warning">{activeRelease.status}</Badge>
            <p className="text-sm text-muted-foreground">Target: {formatReleaseDate(activeRelease.targetDate)}</p>
          </div>
          <CardTitle className="text-xl">{activeRelease.title}</CardTitle>
          <CardDescription>
            v{activeRelease.version} starts the transition from demo/localStorage persistence toward real server-backed persistence. This release is being worked on and has not been released yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border bg-muted/10 p-4" aria-labelledby="active-release-focus">
            <div className="mb-3 flex items-center gap-2">
              <Badge tone="default">Focus</Badge>
              <h3 id="active-release-focus" className="text-sm font-semibold">Focus</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {activeRelease.focus.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border bg-muted/10 p-4" aria-labelledby="active-release-added">
            <div className="mb-3 flex items-center gap-2">
              <Badge tone="success">Added</Badge>
              <h3 id="active-release-added" className="text-sm font-semibold">Added</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {activeRelease.sections.added.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {releaseNotes.map((release) => (
          <Card key={release.version} id={getReleaseAnchor(release.version)}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={release.version === latestRelease.version ? "success" : "muted"}>
                  v{release.version}
                </Badge>
                <Badge tone="success">{release.status}</Badge>
                <p className="text-sm text-muted-foreground">{formatReleaseDate(release.date)}</p>
              </div>
              <CardTitle className="text-xl">{release.title}</CardTitle>
              <CardDescription>{release.summary}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {(Object.keys(sectionLabels) as ReleaseNoteSection[]).map((section) => (
                <section key={section} className="rounded-lg border bg-muted/10 p-4" aria-labelledby={`${getReleaseAnchor(release.version)}-${section}`}>
                  <div className="mb-3 flex items-center gap-2">
                    <Badge tone={sectionTone[section]}>{sectionLabels[section]}</Badge>
                    <h3 id={`${getReleaseAnchor(release.version)}-${section}`} className="text-sm font-semibold">
                      {sectionLabels[section]}
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {release.sections[section].map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
