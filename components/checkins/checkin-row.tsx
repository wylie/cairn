import Link from "next/link";
import type { CheckInLogRecord } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function normalize(value: string) {
  return value.replace(/_/g, " ");
}

export function CheckInRow({
  record,
  readOnly,
  onCheckOut
}: {
  record: CheckInLogRecord;
  readOnly: boolean;
  onCheckOut: (recordId: string) => void;
}) {
  return (
    <div
      data-testid={`checkin-row-${record.customerId}`}
      className="relative grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1.3fr_1fr_1fr_1.2fr_auto] md:items-center"
    >
      <Link
        href={`/customers/${record.customerId}`}
        aria-label={`Open customer profile for ${record.customerName}`}
        className="absolute inset-0 rounded-lg transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="relative z-10 pointer-events-none">
        <p className="font-medium">{record.customerName}</p>
        <p className="text-sm text-muted-foreground">{record.membershipPassType}</p>
      </div>
      <div className="relative z-10 pointer-events-none text-sm text-muted-foreground">In: {formatTime(record.checkInTime)}</div>
      <div className="relative z-10 pointer-events-none text-sm text-muted-foreground">Out: {formatTime(record.checkOutTime)}</div>
      <div className="relative z-10 pointer-events-none flex flex-wrap items-center gap-2">
        <Badge tone="muted">{normalize(record.entryMethod)}</Badge>
        <Badge tone="muted">{normalize(record.checkInSource)}</Badge>
        <Badge tone={record.status === "checked-in" ? "success" : "muted"}>{record.status === "checked-in" ? "Checked In" : "Checked Out"}</Badge>
      </div>
      {record.status === "checked-in" && !readOnly ? (
        <Button className="relative z-10" onClick={() => onCheckOut(record.id)} aria-label={`Check Out ${record.customerName}`}>Check Out</Button>
      ) : (
        <Link className="relative z-10" href={`/customers/${record.customerId}`}>
          <Button variant="outline">View Customer</Button>
        </Link>
      )}
      {typeof record.punchesUsed === "number" || typeof record.punchesRemaining === "number" ? (
        <p className="relative z-10 pointer-events-none md:col-span-5 text-xs text-muted-foreground">
          Punches used: {record.punchesUsed ?? 0} • Remaining: {record.punchesRemaining ?? "N/A"}
        </p>
      ) : null}
    </div>
  );
}
