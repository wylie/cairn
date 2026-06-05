"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { HouseholdsWorkspace } from "@/components/households/households-workspace";

export default function HouseholdsPage() {
  const pathname = usePathname() ?? "/households";
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString?.() ?? "";
  const householdId = searchParams?.get?.("householdId") ?? undefined;

  return <HouseholdsWorkspace initialHouseholdId={householdId} pathname={pathname} currentSearch={currentSearch} />;
}
