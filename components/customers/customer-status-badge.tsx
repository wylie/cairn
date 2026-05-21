import { Badge } from "@/components/ui/badge";

export function CustomerStatusBadge({ checkedIn }: { checkedIn: boolean }) {
  return <Badge tone={checkedIn ? "success" : "muted"}>{checkedIn ? "Checked In" : "Checked Out"}</Badge>;
}
