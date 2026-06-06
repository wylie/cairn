import Link from "next/link";
import type { CheckInLogRecord, Customer } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffAttributionLabel } from "@/components/staff/staff-attribution-label";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { InfoField } from "@/components/shared/info-field";
import { formatTime } from "@/lib/format/date";

function normalize(value: string) {
  return value.replace(/_/g, " ");
}

export function CheckInRow({
  record,
  customer,
  viewCustomerHref,
  readOnly,
  onCheckOut
}: {
  record: CheckInLogRecord;
  customer?: Pick<Customer, "firstName" | "lastName" | "profilePhotoUrl"> | null;
  viewCustomerHref?: string;
  readOnly: boolean;
  onCheckOut: (recordId: string) => void;
}) {
  const checkedInByStaffId = record.checkedInByStaffId ?? record.staffUserId;
  const fallbackNameParts = record.customerName.split(" ");
  const resolvedName = customer ? `${customer.firstName} ${customer.lastName}` : record.customerName;

  return (
    <div
      data-testid={`checkin-row-${record.customerId}`}
      className="relative grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 md:grid-cols-[minmax(0,1.45fr)_minmax(0,1.05fr)_auto] md:items-start"
    >
      <Link
        href={viewCustomerHref ?? `/customers/${record.customerId}`}
        aria-label={`Open customer profile for ${record.customerName}`}
        className="absolute inset-0 rounded-lg transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="relative z-10 pointer-events-none flex items-start gap-3">
        <CustomerAvatar
          customer={
            customer ?? {
              firstName: fallbackNameParts[0] ?? "",
              lastName: fallbackNameParts.slice(1).join(" ") ?? "",
              profilePhotoUrl: undefined
            }
          }
          size="sm"
          className="bg-card"
        />
        <div className="space-y-2">
          <div>
            <p className="font-medium">{resolvedName}</p>
            <p className="text-sm text-muted-foreground">{record.membershipPassType}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted">{normalize(record.entryMethod)}</Badge>
            <Badge tone="muted">{normalize(record.checkInSource)}</Badge>
            <Badge tone={record.status === "checked-in" ? "success" : "muted"}>{record.status === "checked-in" ? "Checked In" : "Checked Out"}</Badge>
          </div>
        </div>
      </div>
      <div className="relative z-10 pointer-events-none grid gap-3 sm:grid-cols-2">
        <InfoField label="Check In" value={formatTime(record.checkInTime)} />
        <InfoField label="Check Out" value={formatTime(record.checkOutTime)} />
      </div>
      <div className="relative z-10 flex flex-col items-stretch gap-2 md:items-end">
        {record.status === "checked-in" && !readOnly ? (
          <Button
            className="relative z-10 min-h-11 w-full whitespace-normal text-left leading-tight md:w-auto"
            onClick={() => onCheckOut(record.id)}
            aria-label={`Check Out ${record.customerName}`}
          >
            {`Check Out ${record.customerName}`}
          </Button>
        ) : (
          <Link className="relative z-10 w-full md:w-auto" href={viewCustomerHref ?? `/customers/${record.customerId}`}>
            <Button variant="secondary" className="w-full md:w-auto">View Customer</Button>
          </Link>
        )}
      </div>
      <div className="relative z-10 pointer-events-none grid gap-2 text-sm md:col-span-3 md:grid-cols-2">
        <StaffAttributionLabel
          label="Checked in by"
          staffId={checkedInByStaffId}
          fallbackName={record.checkedInByStaffName}
        />
        {record.checkedOutByStaffId || record.checkedOutByStaffName ? (
          <StaffAttributionLabel
            label="Checked out by"
            staffId={record.checkedOutByStaffId}
            fallbackName={record.checkedOutByStaffName}
          />
        ) : null}
        {typeof record.punchesUsed === "number" || typeof record.punchesRemaining === "number" ? (
          <p>Punches used: {record.punchesUsed ?? 0} • Remaining: {record.punchesRemaining ?? "N/A"}</p>
        ) : null}
      </div>
    </div>
  );
}
