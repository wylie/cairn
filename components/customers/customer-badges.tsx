import { Badge } from "@/components/ui/badge";
import { CustomerStatusBadge } from "@/components/customers/customer-status-badge";
import type { Customer, Membership, PunchPass, Waiver } from "@/types/domain";

export function CustomerBadges({
  customer,
  membership,
  punchPass,
  waiver
}: {
  customer: Customer;
  membership?: Membership;
  punchPass?: PunchPass;
  waiver?: Waiver;
}) {
  const hasActiveMembership = membership?.status === "active";
  const hasAccessProduct = Boolean(punchPass || customer.dayPassProductName || hasActiveMembership);

  return (
    <div className="flex flex-wrap gap-2">
      {hasActiveMembership ? <Badge tone="success">Membership Active</Badge> : null}
      {membership?.status === "expiring" ? <Badge tone="warning">Membership Expiring Soon</Badge> : null}
      {punchPass ? <Badge tone="muted">Punch Pass</Badge> : null}
      {customer.dayPassProductName ? <Badge tone="muted">Day Pass</Badge> : null}
      {waiver?.status === "valid" ? <Badge tone="success">Waiver Valid</Badge> : <Badge tone="danger">Waiver Missing</Badge>}
      {!hasAccessProduct ? <Badge tone="warning">No Active Access</Badge> : null}
      <CustomerStatusBadge checkedIn={customer.checkInStatus === "in"} />
    </div>
  );
}
