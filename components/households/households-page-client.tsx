"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { HouseholdsWorkspace } from "@/components/households/households-workspace";
import type { Household } from "@/types/domain";

export function HouseholdsPageClient({ persistedHouseholds }: { persistedHouseholds?: Household[] }) {
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
    />
  );
}
