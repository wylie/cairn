import {
  ReleaseSectionBadge,
  ReleaseTypeBadge,
  VersionBadge,
  getReleaseSectionLabel
} from "@/components/releases/release-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import {
  getReleaseAnchor,
  getReleaseCommitUrl,
  getShortCommitHash,
  releaseNotes,
  type ReleaseNoteSection
} from "@/lib/releases/release-notes";
import { version } from "@/lib/version";

const releaseSections: ReleaseNoteSection[] = ["added", "improved", "fixed", "changed", "knownIssues"];

function formatReleaseDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export default function ReleaseNotesPage() {
  return (
    <section className="space-y-4">
      <PageHeader
        title="Release Notes"
        description="Shipped product updates, fixes, known issues, and changes ordered newest first."
        actions={<VersionBadge version={version.currentVersion} />}
      />

      <div className="space-y-4">
        {releaseNotes.map((release) => {
          const commitUrl = getReleaseCommitUrl(release);

          return (
            <Card key={release.version} id={getReleaseAnchor(release.version)}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <VersionBadge version={release.version} />
                  <ReleaseTypeBadge releaseType={release.releaseType} />
                  <p className="text-sm text-muted-foreground">{formatReleaseDate(release.releaseDate)}</p>
                  {commitUrl && release.commitHash ? (
                    <a
                      href={commitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      Commit {getShortCommitHash(release.commitHash)}
                    </a>
                  ) : commitUrl ? (
                    <a
                      href={commitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      View commit
                    </a>
                  ) : null}
                </div>
                <CardTitle className="text-xl">{release.releaseName}</CardTitle>
                <CardDescription>{release.summary}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {releaseSections.map((section) => {
                  const items = release.sections[section];
                  if (items.length === 0) return null;
                  const label = getReleaseSectionLabel(section);

                  return (
                    <section key={section} className="rounded-lg border bg-muted/10 p-4" aria-labelledby={`${getReleaseAnchor(release.version)}-${section}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <ReleaseSectionBadge section={section} />
                        <h3 id={`${getReleaseAnchor(release.version)}-${section}`} className="text-sm font-semibold">
                          {label}
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
          );
        })}
      </div>
    </section>
  );
}
