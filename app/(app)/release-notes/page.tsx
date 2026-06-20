import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getReleaseAnchor, latestRelease, releaseNotes, type ReleaseNoteSection } from "@/lib/releases/release-notes";

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
        actions={<Badge tone="muted">Cairn v{latestRelease.version}</Badge>}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current version</p>
            <p className="font-semibold">v{latestRelease.version}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest release</p>
            <p className="font-semibold">{formatReleaseDate(latestRelease.date)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Cadence</p>
            <p className="font-semibold">Sunday evening releases</p>
          </div>
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
