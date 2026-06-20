import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { roadmapMilestones, type RoadmapStatus } from "@/lib/releases/roadmap";
import { version } from "@/lib/version";

const statusTone: Record<RoadmapStatus, "default" | "success" | "warning" | "danger" | "muted"> = {
  Shipped: "success",
  Planned: "default",
  Future: "muted"
};

export default function RoadmapPage() {
  return (
    <section className="space-y-4">
      <PageHeader
        title="Roadmap"
        description="Milestone-based direction for future Cairn capability. Version ranges are directional and may shift as shipped releases accumulate."
        actions={<Badge tone="success">Current v{version.currentVersion}</Badge>}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Release Model</p>
            <p className="font-semibold">CI/CD</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Versioning</p>
            <p className="font-semibold">Semantic Versioning</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Version</p>
            <p className="font-semibold">v{version.currentVersion}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {roadmapMilestones.map((milestone) => (
          <Card key={milestone.versionRange}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={milestone.status === "Shipped" ? "success" : "muted"}>{milestone.versionRange}</Badge>
                <Badge tone={statusTone[milestone.status]}>{milestone.status}</Badge>
              </div>
              <CardTitle className="text-xl">{milestone.title}</CardTitle>
              <CardDescription>
                {milestone.status === "Shipped"
                  ? "Shipped foundation now represented in Release Notes."
                  : milestone.status === "Future"
                    ? "Criteria for Cairn's first stable production release."
                    : "Planned product direction, not a deployment commitment."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                {(milestone.criteria ?? milestone.focus).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
