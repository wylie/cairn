import { Badge } from "@/components/ui/badge";

export function AccessEligibilityBadge({
  waiverRequired,
  guardianRequired
}: {
  waiverRequired?: boolean;
  guardianRequired?: boolean;
}) {
  if (!waiverRequired && !guardianRequired) {
    return <Badge tone="muted">Standard access</Badge>;
  }

  return (
    <>
      {waiverRequired ? <Badge tone="warning">Waiver required</Badge> : null}
      {guardianRequired ? <Badge tone="warning">Guardian required</Badge> : null}
    </>
  );
}

