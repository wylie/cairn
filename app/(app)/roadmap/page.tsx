import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { roadmapReleases, type RoadmapStatus } from "@/lib/releases/roadmap";
import { CAIRN_VERSION } from "@/lib/version";

const statusTone: Record<RoadmapStatus, "default" | "success" | "warning" | "danger" | "muted"> = {
  Released: "success",
  "In Progress": "warning",
  Planned: "default",
  Future: "muted"
};

export default function RoadmapPage() {
  return (
    <section className="space-y-4">
      <PageHeader
        title="Roadmap"
        description="Version-based direction for pilot testing and future customer onboarding. Targets are directional, not guarantees."
        actions={<Badge tone="warning">Active development v{CAIRN_VERSION}</Badge>}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Release model</p>
            <p className="font-semibold">Version-based roadmap</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Planned cadence</p>
            <p className="font-semibold">Sunday evening releases</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pilot status</p>
            <p className="font-semibold">v0.2.0 active development</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {roadmapReleases.map((release) => (
          <Card key={release.version}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={release.status === "In Progress" ? "warning" : release.version === CAIRN_VERSION ? "success" : "muted"}>v{release.version}</Badge>
                <Badge tone={statusTone[release.status]}>{release.status}</Badge>
                <p className="text-sm text-muted-foreground">
                  {release.status === "Released" ? "Released" : release.status === "Future" ? "Criteria" : "Target"}: {release.target}
                </p>
              </div>
              <CardTitle className="text-xl">{release.title}</CardTitle>
              <CardDescription>
                {release.status === "Future"
                  ? "Production readiness criteria for Cairn's first stable release."
                  : release.status === "Released"
                    ? "Completed release notes and delivered pilot scope."
                    : release.status === "In Progress"
                      ? "Active development focus for this release window."
                      : "Planned focus for this release window."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {release.categories ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {release.categories.map((category) => (
                    <section key={category.title} className="rounded-lg border bg-muted/10 p-4" aria-labelledby={`roadmap-${release.version}-${category.title.replaceAll(" ", "-").toLowerCase()}`}>
                      <h3 id={`roadmap-${release.version}-${category.title.replaceAll(" ", "-").toLowerCase()}`} className="text-sm font-semibold">
                        {category.title}
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {category.focus.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : (
                <ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  {(release.criteria ?? release.focus ?? []).map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
