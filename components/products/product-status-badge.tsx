import { Badge } from "@/components/ui/badge";

export function ProductStatusBadge({ active }: { active?: boolean }) {
  return <Badge tone={active === false ? "muted" : "success"}>{active === false ? "Inactive" : "Active"}</Badge>;
}

