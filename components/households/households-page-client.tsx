"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { HouseholdsWorkspace } from "@/components/households/households-workspace";
import type { Customer, Household, HouseholdMember } from "@/types/domain";

export function HouseholdsPageClient({
  persistedHouseholds,
  persistedCustomers,
  persistedHouseholdMembers
}: {
  persistedHouseholds?: Household[];
  persistedCustomers?: Customer[];
  persistedHouseholdMembers?: HouseholdMember[];
}) {
  const pathname = usePathname() ?? "/households";
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString?.() ?? "";
  const householdId = searchParams?.get?.("householdId") ?? undefined;

  return (
    <HouseholdsWorkspace
      initialHouseholdId={householdId}
      pathname={pathname}
      currentSearch={currentSearch}
      persistedHouseholds={persistedHouseholds}
      persistedCustomers={persistedCustomers}
      persistedHouseholdMembers={persistedHouseholdMembers}
    />
  );
}
