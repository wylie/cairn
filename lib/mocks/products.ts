import type { PosProduct } from "@/types/domain";

export const posProducts: PosProduct[] = [
  { id: "prd_001", organizationId: "org_summit", name: "Day Pass", category: "pass", priceCents: 2800 },
  { id: "prd_002", organizationId: "org_summit", name: "Monthly Unlimited", category: "membership", priceCents: 11900 },
  { id: "prd_003", organizationId: "org_summit", name: "Chalk Bag", category: "retail", priceCents: 2400 }
];
