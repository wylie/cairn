import Link from "next/link";
import type { Customer, Membership, PunchPass, Waiver } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerBadges } from "@/components/customers/customer-badges";
import { Badge } from "@/components/ui/badge";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { formatShortDate } from "@/lib/format/date";

export function CustomerCard({
  customer,
  membership,
  punchPass,
  waiver,
  householdHref,
  canCheckIn,
  blockedReason,
  viewProfileHref,
  onToggleCheckIn,
  onSellAccess
}: {
  customer: Customer;
  membership?: Membership;
  punchPass?: PunchPass;
  waiver?: Waiver;
  householdHref?: string;
  canCheckIn: boolean;
  blockedReason?: string;
  viewProfileHref?: string;
  onToggleCheckIn: (customerId: string) => void;
  onSellAccess: (customerId: string) => void;
}) {
  const checkedIn = customer.checkInStatus === "in";
  const disableAction = !checkedIn && !canCheckIn;
  const displayFirstName = customer.preferredName?.trim() ? customer.preferredName.trim() : customer.firstName;
  const legalNameDiffers = displayFirstName.toLowerCase() !== customer.firstName.toLowerCase();
  const pronounsLabel = customer.pronouns === "Custom" ? customer.customPronouns?.trim() || "Not set" : customer.pronouns?.trim() || "Not set";
  const hasPronouns = pronounsLabel !== "Not set";
  const preferredLabel = customer.preferredName?.trim() || "Not set";
  const hasPreferred = preferredLabel !== "Not set";
  const phoneLabel = customer.phone?.trim() || "Missing ⚠";
  const hasPhone = Boolean(customer.phone?.trim());
  const emergencyName = customer.emergencyContactName?.trim() || "";
  const emergencyPhone = customer.emergencyContactPhone?.trim() || "";
  const hasEmergency = Boolean(emergencyName && emergencyPhone);
  const emergencyLabel = hasEmergency ? `${emergencyName}\n${emergencyPhone}` : "Missing ⚠";
  const profileHref = viewProfileHref ?? `/customers/${customer.id}`;
  const dobDate = customer.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00Z`) : null;
  const hasValidDob = !!dobDate && !Number.isNaN(dobDate.getTime());
  const age = hasValidDob
    ? Math.max(
        0,
        Math.floor((Date.now() - (dobDate as Date).getTime()) / (1000 * 60 * 60 * 24 * 365.2425))
      )
    : null;
  const dobDisplay = hasValidDob ? `${formatShortDate(dobDate)} (${age})` : "Missing ⚠";
  const isBirthdayToday = hasValidDob
    ? (() => {
        const now = new Date();
        return (
          now.getUTCMonth() === (dobDate as Date).getUTCMonth() &&
          now.getUTCDate() === (dobDate as Date).getUTCDate()
        );
      })()
    : false;
  return (
    <Card className="h-full transition hover:-translate-y-0.5 hover:shadow">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Link href={profileHref} aria-label={`Open customer profile for ${customer.firstName} ${customer.lastName}`}>
              <CustomerAvatar customer={customer} sizeClassName="h-16 w-16" />
            </Link>
            <div>
            <p className="font-semibold">{displayFirstName} {customer.lastName}</p>
            {legalNameDiffers ? <p className="text-sm text-muted-foreground">Legal: {customer.firstName} {customer.lastName}</p> : null}
            <p className="mt-1 text-sm text-muted-foreground">{customer.memberId}</p>
            </div>
          </div>
          {isBirthdayToday ? (
            <div className="shrink-0 rounded-md bg-amber-100/70 px-2.5 py-1.5 text-amber-900">
              <p className="text-xs font-semibold">🎂 Birthday today</p>
              <p className="text-[11px] font-medium">Say happy birthday to {displayFirstName}</p>
            </div>
          ) : null}
        </div>

        <div aria-label="Quick Info" className="grid grid-cols-2 gap-1.5">
          <QuickInfoItem label="Preferred" value={preferredLabel} warning={!hasPreferred} />
          <QuickInfoItem label="Pronouns" value={pronounsLabel} warning={!hasPronouns} />
          <QuickInfoItem label="DOB / Age" value={dobDisplay} warning={!hasValidDob} />
          <QuickInfoItem label="Phone" value={phoneLabel} warning={!hasPhone} />
          <QuickInfoItem label="Emergency Contact" value={emergencyLabel} warning={!hasEmergency} className="col-span-2" />
        </div>

        <CustomerBadges customer={customer} membership={membership} punchPass={punchPass} waiver={waiver} />
        {customer.staffProfile?.isStaff ? (
          <Badge tone="muted">Staff: {customer.staffProfile.role.replace("_", " ")}</Badge>
        ) : null}

        <div className="mt-auto">
          <div className="flex flex-wrap gap-2">
          <Link href={profileHref}>
            <Button variant="secondary" className="min-h-11">View Profile</Button>
          </Link>
          {householdHref ? (
            <Link href={householdHref}>
              <Button variant="secondary" className="min-h-11">View Household</Button>
            </Link>
          ) : null}
          <Button onClick={() => onSellAccess(customer.id)} variant="secondary" className="min-h-11">Sell Access</Button>
          <Button
            onClick={() => onToggleCheckIn(customer.id)}
            className="min-h-11"
            variant={checkedIn ? "secondary" : "primary"}
            disabled={disableAction}
            aria-label={disableAction && blockedReason ? blockedReason : undefined}
          >
            {checkedIn ? "Check Out" : "Check In"}
          </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickInfoItem({ label, value, warning, className }: { label: string; value: string; warning?: boolean; className?: string }) {
  return (
    <div className={`rounded-sm bg-secondary/35 px-2 py-1.5 ${className ?? ""}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`whitespace-pre-line text-sm font-medium leading-5 ${warning ? "text-amber-700" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
