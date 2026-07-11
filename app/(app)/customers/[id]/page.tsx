import { cookies } from "next/headers";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { getCustomerByOrganization, getCustomersByOrganization } from "@/db/repositories/customer-repository";
import { getHouseholdsByOrganization } from "@/db/repositories/household-repository";
import { getCheckInHistoryForCustomer } from "@/db/repositories/check-in-repository";
import { getMembershipsForCustomer, membershipToAccessRecord } from "@/db/repositories/membership-repository";
import { getActiveFacilityContext } from "@/db/tenant";
import {
  buildHouseholdMembersFromCustomers,
  mapCustomerRecordToDisplayCustomer,
  mapHouseholdRecordToDisplayHousehold
} from "@/lib/customer-household-persistence";

async function getPersistedCustomerContext(customerId: string) {
  if (process.env.NODE_ENV === "test") return undefined;

  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context) return undefined;
  if (context.source !== "database") return undefined;

  try {
    const [customer, customers, households] = await Promise.all([
      getCustomerByOrganization(customerId, context.organization.id),
      getCustomersByOrganization(context.organization.id),
      getHouseholdsByOrganization(context.organization.id)
    ]);
    if (!customer) return undefined;
    const locationId = context.activeFacility?.id ?? context.facilities[0]?.id ?? "";
    const displayCustomers = customers.map((entry, index) => mapCustomerRecordToDisplayCustomer(entry, index, locationId));
    const customersById = new Map(displayCustomers.map((entry) => [entry.id, entry]));
    const displayHouseholds = households.map((entry) => mapHouseholdRecordToDisplayHousehold(entry, customersById, locationId));
    const [membershipRows, checkInRows] = await Promise.all([
      getMembershipsForCustomer(customer.id, context.organization.id),
      getCheckInHistoryForCustomer(customer.id, context.organization.id, 6)
    ]);
    const persistedAccessRecords = membershipRows.map((row) => {
      const accessRecord = membershipToAccessRecord(row);
      return { ...accessRecord, customerId: customer.id };
    });
    const persistedCheckInRecords = checkInRows.map((row) => ({
      id: row.checkIn.id,
      organizationId: row.checkIn.organizationId,
      locationId: row.checkIn.facilityId,
      customerId: row.customer.id,
      customerName: `${row.customer.firstName} ${row.customer.lastName}`,
      membershipPassType: row.plan?.name ?? "Membership access",
      entryMethod: "membership" as const,
      passProductUsed: row.plan?.name ?? undefined,
      checkInTime: row.checkIn.checkedInAt.toISOString(),
      checkOutTime: row.checkIn.checkedOutAt?.toISOString() ?? null,
      checkInSource: "manual_search" as const,
      status: row.checkIn.status,
      checkedInByStaffId: row.checkIn.checkedInByStaffId ?? "staff_unrecorded",
      checkedInByStaffName: row.checkIn.checkedInByStaffName ?? undefined,
      checkedOutByStaffId: row.checkIn.checkedOutByStaffId ?? undefined,
      checkedOutByStaffName: row.checkIn.checkedOutByStaffName ?? undefined,
      notes: row.checkIn.denialReason ?? undefined
    }));

    return {
      customer: mapCustomerRecordToDisplayCustomer(customer, 0, locationId),
      customers: displayCustomers,
      households: displayHouseholds,
      householdMembers: buildHouseholdMembersFromCustomers(displayCustomers, displayHouseholds),
      accessRecords: persistedAccessRecords,
      checkInRecords: persistedCheckInRecords
    };
  } catch {
    return undefined;
  }
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persisted = await getPersistedCustomerContext(id);
  return (
    <CustomerDetailView
      customerId={id}
      persistedCustomer={persisted?.customer}
      persistedCustomers={persisted?.customers}
      persistedHouseholds={persisted?.households}
      persistedHouseholdMembers={persisted?.householdMembers}
      persistedAccessRecords={persisted?.accessRecords}
      persistedCheckInRecords={persisted?.checkInRecords}
      persistedMode={process.env.NODE_ENV !== "test"}
    />
  );
}
