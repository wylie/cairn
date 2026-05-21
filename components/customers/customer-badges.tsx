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
  return (
    <div className="flex flex-wrap gap-2">
      {membership?.status === "active" ? <Badge tone="success">Active Member</Badge> : null}
      {membership?.status === "expiring" ? <Badge tone="warning">Expiring Soon</Badge> : null}
      {punchPass ? <Badge tone="muted">Multi-Visit Pass</Badge> : null}
      {customer.dayPassProductName ? <Badge tone="muted">Day Pass</Badge> : null}
      {!waiver || waiver.status !== "signed" ? <Badge tone="danger">Waiver Missing</Badge> : null}
      <CustomerStatusBadge checkedIn={customer.checkInStatus === "in"} />
    </div>
  );
}
