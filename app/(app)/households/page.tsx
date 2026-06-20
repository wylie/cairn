import { cookies } from "next/headers";
import { HouseholdsPageClient } from "@/components/households/households-page-client";
import { getDatabase } from "@/db";
import { getActiveFacilityContext } from "@/db/tenant";
import { getCustomersByOrganization, type CustomerRecord } from "@/db/repositories/customer-repository";
import { getHouseholdsByOrganization, type HouseholdRecord } from "@/db/repositories/household-repository";
import type { Customer, Household } from "@/types/domain";

function mapHouseholdRecordToDisplayHousehold(
  household: HouseholdRecord,
  customersById: Map<string, Customer>,
  locationId: string
): Household {
  const primaryContactId = household.primaryContactId ?? "";
  const primaryContact = customersById.get(primaryContactId);

  return {
    id: household.id,
    householdName: household.name,
    primaryContactCustomerId: primaryContactId,
    billingCustomerId: primaryContactId,
    locationId,
    householdStatus: "active",
    preferredCommunicationMethod: primaryContact?.phone ? "sms" : "email",
    email: primaryContact?.email,
    phone: primaryContact?.phone,
    notes: "Database-backed household foundation record.",
    createdAt: household.createdAt.toISOString()
  };
}

function mapCustomerRecordToDisplayCustomer(customer: CustomerRecord): Customer {
  return {
    id: customer.id,
    memberId: customer.id,
    organizationId: customer.organizationId,
    locationId: "",
    firstName: customer.firstName,
    lastName: customer.lastName,
    preferredName: customer.preferredName ?? undefined,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    dateOfBirth: customer.birthDate ?? undefined,
    tags: [],
    checkInStatus: "out",
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString()
  };
}

async function getDatabaseHouseholdsForActiveOrganization() {
  if (!getDatabase()) return undefined;

  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context) return undefined;

  try {
    const [households, customers] = await Promise.all([
      getHouseholdsByOrganization(context.organization.id),
      getCustomersByOrganization(context.organization.id)
    ]);
    const customersById = new Map(customers.map((customer) => [customer.id, mapCustomerRecordToDisplayCustomer(customer)]));
    const locationId = context.activeFacility?.id ?? context.facilities[0]?.id ?? "";

    return households.map((household) => mapHouseholdRecordToDisplayHousehold(household, customersById, locationId));
  } catch {
    return undefined;
  }
}

export default async function HouseholdsPage() {
  const households = await getDatabaseHouseholdsForActiveOrganization();

  return <HouseholdsPageClient persistedHouseholds={households} />;
}
