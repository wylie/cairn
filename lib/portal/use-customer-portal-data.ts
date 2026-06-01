"use client";

import { useMemo } from "react";
import { useCustomerState } from "@/lib/state/customer-state";
import { getSessionFromCookieClient } from "@/lib/tenant/client";
import { getVisibleCustomerIds } from "@/lib/portal/visibility";

export function useCustomerPortalData() {
  const state = useCustomerState();
  const session = getSessionFromCookieClient();
  const primaryCustomerId = session?.kind === "customer" ? session.customerId : undefined;

  const visibleCustomerIds = useMemo(
    () => (primaryCustomerId ? getVisibleCustomerIds(primaryCustomerId, state.householdMembers) : []),
    [primaryCustomerId, state.householdMembers]
  );

  const visibleCustomers = useMemo(
    () => state.customers.filter((entry) => visibleCustomerIds.includes(entry.id)),
    [state.customers, visibleCustomerIds]
  );

  const primaryCustomer = visibleCustomers.find((entry) => entry.id === primaryCustomerId) ?? visibleCustomers[0];

  return {
    ...state,
    session,
    primaryCustomerId,
    primaryCustomer,
    visibleCustomerIds,
    visibleCustomers
  };
}
