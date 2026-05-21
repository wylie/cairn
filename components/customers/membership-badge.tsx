import type { MembershipState } from "@/types/domain";
import { Badge } from "@/components/ui/badge";

const map: Record<MembershipState, { label: string; tone: "success" | "warning" | "danger" | "muted" }> = {
  active: { label: "Active", tone: "success" },
  expiring: { label: "Expiring", tone: "warning" },
  inactive: { label: "Inactive", tone: "danger" },
  trial: { label: "Trial", tone: "muted" }
};

export function MembershipBadge({ status }: { status: MembershipState }) {
  const variant = map[status];
  return <Badge tone={variant.tone}>{variant.label}</Badge>;
}
