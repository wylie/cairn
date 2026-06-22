import type { CustomerRecord } from "@/db/repositories/customer-repository";
import type { HouseholdRecord } from "@/db/repositories/household-repository";
import type { Customer, Household, HouseholdMember } from "@/types/domain";

export function buildDisplayMemberId(customer: CustomerRecord, index: number) {
  if (customer.id.startsWith("cust_rb_")) return `RB-${String(1001 + index).padStart(4, "0")}`;
  if (customer.id.startsWith("cust_wcymca_")) return `WC-${String(1001 + index).padStart(4, "0")}`;
  if (customer.id.startsWith("cust_staff_")) return `S-${String(2001 + index).padStart(4, "0")}`;
  return `M-${String(1001 + index).padStart(4, "0")}`;
}

export function mapCustomerRecordToDisplayCustomer(customer: CustomerRecord, index: number, locationId: string): Customer {
  return {
    id: customer.id,
    memberId: buildDisplayMemberId(customer, index),
    organizationId: customer.organizationId,
    locationId,
    householdId: customer.householdId ?? undefined,
    firstName: customer.firstName,
    lastName: customer.lastName,
    preferredName: customer.preferredName ?? undefined,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    dateOfBirth: customer.birthDate ?? undefined,
    tags: customer.active ? ["Neon"] : ["Neon", "Inactive"],
    checkInStatus: "out",
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString()
  };
}

export function mapHouseholdRecordToDisplayHousehold(
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
    notes: "Neon-backed household record.",
    createdAt: household.createdAt.toISOString()
  };
}

function getAge(dateOfBirth?: string) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

export function buildHouseholdMembersFromCustomers(customers: Customer[], households: Household[]): HouseholdMember[] {
  const householdsById = new Map(households.map((household) => [household.id, household]));

  return customers
    .filter((customer) => Boolean(customer.householdId))
    .map((customer) => {
      const householdId = customer.householdId!;
      const household = householdsById.get(householdId);
      const isPrimary = household?.primaryContactCustomerId === customer.id;
      const isMinor = (getAge(customer.dateOfBirth) ?? 18) < 18;

      return {
        householdId,
        customerId: customer.id,
        memberType: isMinor ? "child" : "adult",
        role: isPrimary ? "primary-adult" : isMinor ? "child" : "adult",
        relationship: isPrimary ? "parent_guardian" : isMinor ? "child" : "other",
        canCheckInOthers: isPrimary,
        canPurchaseForOthers: isPrimary,
        canSignWaivers: isPrimary,
        emergencyContactPriority: isPrimary ? 1 : undefined
      };
    });
}
