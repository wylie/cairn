import Link from "next/link";
import type { Customer, Membership, PunchPass, Waiver } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerBadges } from "@/components/customers/customer-badges";

export function CustomerCard({
  customer,
  membership,
  punchPass,
  waiver,
  canCheckIn,
  blockedReason,
  onToggleCheckIn,
  onSellAccess
}: {
  customer: Customer;
  membership?: Membership;
  punchPass?: PunchPass;
  waiver?: Waiver;
  canCheckIn: boolean;
  blockedReason?: string;
  onToggleCheckIn: (customerId: string) => void;
  onSellAccess: (customerId: string) => void;
}) {
  const checkedIn = customer.checkInStatus === "in";
  const disableAction = !checkedIn && !canCheckIn;

  return (
    <Card className="transition hover:-translate-y-0.5 hover:shadow">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{customer.firstName} {customer.lastName}</p>
            <p className="text-sm text-muted-foreground">{customer.memberId} • {customer.email}</p>
          </div>
        </div>

        <CustomerBadges customer={customer} membership={membership} punchPass={punchPass} waiver={waiver} />

        <div className="flex flex-wrap gap-2">
          <Link href={`/customers/${customer.id}`}>
            <Button variant="outline" className="min-h-11">View Profile</Button>
          </Link>
          <Button onClick={() => onSellAccess(customer.id)} variant="outline" className="min-h-11">Sell Access</Button>
          <Button
            onClick={() => onToggleCheckIn(customer.id)}
            className="min-h-11"
            variant={checkedIn ? "outline" : "default"}
            disabled={disableAction}
            aria-label={disableAction && blockedReason ? blockedReason : undefined}
          >
            {checkedIn ? "Check Out" : "Check In"}
          </Button>
        </div>
        {disableAction && blockedReason ? <p className="text-xs text-amber-800">{blockedReason}</p> : null}
      </CardContent>
    </Card>
  );
}
