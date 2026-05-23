import type { SessionScheduleCardModel } from "@/lib/data/session-schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatTimeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • ${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}–${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function SessionScheduleCard({
  entry,
  onOpen,
  onEdit,
  compact = false
}: {
  entry: SessionScheduleCardModel;
  onOpen: (sessionId: string) => void;
  onEdit: (sessionId: string) => void;
  compact?: boolean;
}) {
  const session = entry.session;
  const status = session.status ?? "scheduled";

  return (
    <article className="rounded-xl border bg-card p-3" aria-label={`session-card-${session.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{session.title ?? entry.program?.title ?? "Untitled Session"}</p>
          <p className="text-sm text-muted-foreground">{entry.program?.title ?? "Unknown Program"}</p>
          <p className="text-sm text-muted-foreground">{formatTimeRange(session.startsAt, session.endsAt)}</p>
          <p className="text-sm text-muted-foreground">{entry.registrationCount} / {session.capacity} registered</p>
          <p className="text-xs text-muted-foreground">{entry.waitlistCount} waitlisted</p>
          <p className="text-xs text-muted-foreground">Instructor: {session.instructorName ?? "Unassigned"}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={status === "cancelled" ? "destructive" : "secondary"}>{status}</Badge>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button className="h-10" variant="secondary" onClick={() => onOpen(session.id)}>
          {compact ? "Open" : "View Details"}
        </Button>
        <Button className="h-10" variant="secondary" onClick={() => onEdit(session.id)}>
          Edit
        </Button>
      </div>
    </article>
  );
}
