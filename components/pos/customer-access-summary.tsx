import type { Customer, Membership, PunchPass } from "@/types/domain";

export function CustomerAccessSummary({
  customer,
  membership,
  punchPass,
  waiverStatus
}: {
  customer: Customer;
  membership?: Membership;
  punchPass?: PunchPass;
  waiverStatus: "valid" | "expired" | "missing";
}) {
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <p className="font-medium">{customer.firstName} {customer.lastName}</p>
      <p className="text-muted-foreground">Membership: {membership?.planName ?? "None"}</p>
      <p className="text-muted-foreground">Pass: {punchPass ? `${punchPass.title} (${punchPass.remainingUses} left)` : customer.dayPassProductName ?? "None"}</p>
      {waiverStatus === "valid" ? (
        <p className="text-muted-foreground">Waiver: Valid</p>
      ) : (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800">Waiver missing or expired</p>
      )}
      <p className="text-muted-foreground">Status: {customer.checkInStatus === "in" ? "Already checked in" : "Checked out"}</p>
    </div>
  );
}
