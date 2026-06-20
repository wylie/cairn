import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getReleaseAnchor, latestRelease, releaseNotes, type ReleaseNoteSection } from "@/lib/releases/release-notes";
import { formatReleaseType, version } from "@/lib/version";

const sectionLabels: Record<ReleaseNoteSection, string> = {
  added: "Added",
  improved: "Improved",
  fixed: "Fixed",
  changed: "Changed",
  knownIssues: "Known Issues"
};

const sectionTone: Record<ReleaseNoteSection, "default" | "success" | "warning" | "danger" | "muted"> = {
  added: "success",
  improved: "default",
  fixed: "muted",
  changed: "warning",
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
        description="Shipped product updates, fixes, known issues, and changes ordered newest first."
        actions={<Badge tone="success">v{version.currentVersion}</Badge>}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Version</p>
            <p className="font-semibold">v{version.currentVersion}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Release Type</p>
            <p className="font-semibold">{formatReleaseType(version.releaseType)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Released</p>
            <p className="font-semibold">{formatReleaseDate(version.releaseDate)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
            <p className="font-semibold">{version.summary}</p>
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
                <Badge tone="muted">{formatReleaseType(release.releaseType)}</Badge>
                <p className="text-sm text-muted-foreground">{formatReleaseDate(release.releaseDate)}</p>
              </div>
              <CardTitle className="text-xl">{release.releaseName}</CardTitle>
              <CardDescription>{release.summary}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {(Object.keys(sectionLabels) as ReleaseNoteSection[]).map((section) => {
                const items = release.sections[section];
                if (items.length === 0) return null;

                return (
                  <section key={section} className="rounded-lg border bg-muted/10 p-4" aria-labelledby={`${getReleaseAnchor(release.version)}-${section}`}>
                    <div className="mb-3 flex items-center gap-2">
                      <Badge tone={sectionTone[section]}>{sectionLabels[section]}</Badge>
                      <h3 id={`${getReleaseAnchor(release.version)}-${section}`} className="text-sm font-semibold">
                        {sectionLabels[section]}
                      </h3>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {items.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
