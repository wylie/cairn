import { Badge } from "@/components/ui/badge";
import { StaffAttributionLabel } from "@/components/staff/staff-attribution-label";
import type { CheckInLogRecord } from "@/types/domain";

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function normalize(value: string) {
  return value.replace(/_/g, " ");
}

export function ActivityTimeline({ visits }: { visits: CheckInLogRecord[] }) {
  if (visits.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent visits.</p>;
  }

  return (
    <div className="space-y-2">
      {visits.map((visit) => {
        const checkedInByStaffId = visit.checkedInByStaffId ?? visit.staffUserId;
        return (
        <div key={visit.id} className="rounded-lg border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{formatDate(visit.checkInTime)}</p>
            <Badge tone={visit.status === "checked-in" ? "success" : "muted"}>{visit.status === "checked-in" ? "Checked In" : "Checked Out"}</Badge>
          </div>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <p>Check-in: {formatTime(visit.checkInTime)}</p>
            <p>Check-out: {formatTime(visit.checkOutTime)}</p>
            <p>Entry method: {normalize(visit.entryMethod)}</p>
            <p>Source: {normalize(visit.checkInSource)}</p>
            <p>Pass/Product: {visit.passProductUsed ?? visit.membershipPassType}</p>
            <StaffAttributionLabel
              label="Checked in by"
              staffId={checkedInByStaffId}
              fallbackName={visit.checkedInByStaffName}
            />
            {visit.checkedOutByStaffId || visit.checkedOutByStaffName ? (
              <StaffAttributionLabel
                label="Checked out by"
                staffId={visit.checkedOutByStaffId}
                fallbackName={visit.checkedOutByStaffName}
              />
            ) : null}
            {visit.overrideReason ? <p>Override reason: {visit.overrideReason}</p> : null}
            {typeof visit.punchesUsed === "number" ? <p>Punches used: {visit.punchesUsed}</p> : null}
            {typeof visit.punchesRemaining === "number" ? <p>Punches remaining: {visit.punchesRemaining}</p> : null}
          </div>
        </div>
        );
      })}
    </div>
  );
}
