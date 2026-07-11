"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getActiveFacilityContext } from "@/db/tenant";
import {
  addCustomerToHousehold,
  createHousehold,
  deleteHousehold,
  findHouseholdByName,
  getHouseholdByOrganization,
  getHouseholdMembers,
  removeCustomerFromHousehold,
  setHouseholdPrimaryContact,
  updateHousehold
} from "@/db/repositories/household-repository";
import { getCustomerByOrganization } from "@/db/repositories/customer-repository";

type HouseholdActionResult = {
  ok: boolean;
  message: string;
  householdId?: string;
  customerId?: string;
};

export type PersistedHouseholdInput = {
  name: string;
  primaryContactId?: string | null;
};

async function getActiveOrganizationContext() {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  return context ? { orgSlug, context } : null;
}

function householdDatabaseError(action: "create" | "update" | "delete" | "add" | "remove" | "primaryContact"): HouseholdActionResult {
  const actionLabel =
    action === "add"
      ? "added to this household"
      : action === "remove"
        ? "removed from this household"
        : action === "primaryContact"
          ? "set as primary contact"
          : `${action}d`;
  return {
    ok: false,
    message: `Household could not be ${actionLabel} because the Neon database is unavailable or behind the required migrations. Check Admin Database status and try again.`
  };
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function revalidateHouseholdPaths(orgSlug: string, householdId?: string) {
  revalidatePath("/households");
  revalidatePath(`/o/${orgSlug}/households`);
  if (householdId) {
    revalidatePath(`/households/${householdId}`);
    revalidatePath(`/o/${orgSlug}/households/${householdId}`);
  }
}

function revalidateCustomerPaths(orgSlug: string, customerId?: string) {
  revalidatePath("/customers");
  revalidatePath(`/o/${orgSlug}/customers`);
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/o/${orgSlug}/customers/${customerId}`);
  }
}

async function buildHouseholdName(input: PersistedHouseholdInput, organizationId: string) {
  const explicitName = input.name.trim();
  if (explicitName) return explicitName;
  const primaryContactId = normalizeOptional(input.primaryContactId);
  if (!primaryContactId) return "";
  const customer = await getCustomerByOrganization(primaryContactId, organizationId);
  return customer ? `${customer.lastName} Household` : "";
}

async function validatePrimaryContact(input: {
  organizationId: string;
  primaryContactId: string | null;
  householdId?: string;
}) {
  if (!input.primaryContactId) return "";
  const customer = await getCustomerByOrganization(input.primaryContactId, input.organizationId);
  if (!customer) return "Primary contact must be a customer in this organization.";
  if (customer.householdId && customer.householdId !== input.householdId) {
    return "Primary contact already belongs to another household.";
  }
  return "";
}

async function validateDuplicateHousehold(input: {
  organizationId: string;
  name: string;
  householdId?: string;
}) {
  const duplicate = await findHouseholdByName(input.organizationId, input.name);
  if (!duplicate || duplicate.id === input.householdId) return "";
  return `Possible duplicate household: ${duplicate.name} already exists.`;
}

export async function createPersistedHouseholdAction(input: PersistedHouseholdInput): Promise<HouseholdActionResult> {
  try {
    const active = await getActiveOrganizationContext();
    if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

    const name = await buildHouseholdName(input, active.context.organization.id);
    if (!name) return { ok: false, message: "Household name is required." };
    const primaryContactId = normalizeOptional(input.primaryContactId);

    const primaryContactMessage = await validatePrimaryContact({
      organizationId: active.context.organization.id,
      primaryContactId
    });
    if (primaryContactMessage) return { ok: false, message: primaryContactMessage };

    const duplicateMessage = await validateDuplicateHousehold({
      organizationId: active.context.organization.id,
      name
    });
    if (duplicateMessage) return { ok: false, message: duplicateMessage };

    const householdId = `hh_${crypto.randomUUID()}`;
    const household = await createHousehold({
      id: householdId,
      organizationId: active.context.organization.id,
      name,
      primaryContactId
    });

    if (!household) return { ok: false, message: "Household could not be created in Neon." };

    revalidateHouseholdPaths(active.orgSlug, household.id);
    revalidateCustomerPaths(active.orgSlug, primaryContactId ?? undefined);
    return { ok: true, message: "Household created in Neon.", householdId: household.id };
  } catch {
    return householdDatabaseError("create");
  }
}

export async function updatePersistedHouseholdAction(
  householdId: string,
  input: PersistedHouseholdInput
): Promise<HouseholdActionResult> {
  try {
    const active = await getActiveOrganizationContext();
    if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

    const existing = await getHouseholdByOrganization(householdId, active.context.organization.id);
    if (!existing) return { ok: false, message: "Household not found for this organization." };

    const name = await buildHouseholdName(input, active.context.organization.id);
    if (!name) return { ok: false, message: "Household name is required." };
    const primaryContactId = normalizeOptional(input.primaryContactId);

    const primaryContactMessage = await validatePrimaryContact({
      organizationId: active.context.organization.id,
      primaryContactId,
      householdId
    });
    if (primaryContactMessage) return { ok: false, message: primaryContactMessage };

    const duplicateMessage = await validateDuplicateHousehold({
      organizationId: active.context.organization.id,
      name,
      householdId
    });
    if (duplicateMessage) return { ok: false, message: duplicateMessage };

    const household = await updateHousehold(householdId, active.context.organization.id, {
      name,
      primaryContactId
    });

    if (!household) return { ok: false, message: "Household could not be updated in Neon." };

    revalidateHouseholdPaths(active.orgSlug, household.id);
    revalidateCustomerPaths(active.orgSlug, primaryContactId ?? undefined);
    return { ok: true, message: "Household updated in Neon.", householdId: household.id };
  } catch {
    return householdDatabaseError("update");
  }
}

export async function deletePersistedHouseholdAction(householdId: string): Promise<HouseholdActionResult> {
  try {
    const active = await getActiveOrganizationContext();
    if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

    const existing = await getHouseholdByOrganization(householdId, active.context.organization.id);
    if (!existing) return { ok: false, message: "Household not found for this organization." };
    const members = await getHouseholdMembers(householdId, active.context.organization.id);

    const deleted = await deleteHousehold(householdId, active.context.organization.id);
    if (!deleted) return { ok: false, message: "Household could not be deleted from Neon." };

    revalidateHouseholdPaths(active.orgSlug, householdId);
    members.forEach((member) => revalidateCustomerPaths(active.orgSlug, member.id));
    revalidateCustomerPaths(active.orgSlug);
    return { ok: true, message: `Household deleted from Neon. ${members.length} customer link${members.length === 1 ? "" : "s"} cleared.` };
  } catch {
    return householdDatabaseError("delete");
  }
}

export async function addPersistedHouseholdMemberAction(
  householdId: string,
  customerId: string
): Promise<HouseholdActionResult> {
  try {
    const active = await getActiveOrganizationContext();
    if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

    const customer = await getCustomerByOrganization(customerId, active.context.organization.id);
    if (!customer) return { ok: false, message: "Customer not found for this organization." };
    if (customer.householdId) return { ok: false, message: "Customer already belongs to a household." };

    const added = await addCustomerToHousehold(householdId, active.context.organization.id, customerId);
    if (!added) return { ok: false, message: "Customer could not be added to this household." };

    revalidateHouseholdPaths(active.orgSlug, householdId);
    revalidateCustomerPaths(active.orgSlug, customerId);
    return {
      ok: true,
      message: `${added.firstName} ${added.lastName} added to household.`,
      householdId,
      customerId
    };
  } catch {
    return householdDatabaseError("add");
  }
}

export async function removePersistedHouseholdMemberAction(
  householdId: string,
  customerId: string
): Promise<HouseholdActionResult> {
  try {
    const active = await getActiveOrganizationContext();
    if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

    const removed = await removeCustomerFromHousehold(householdId, active.context.organization.id, customerId);
    if (!removed) return { ok: false, message: "Customer could not be removed from this household." };

    revalidateHouseholdPaths(active.orgSlug, householdId);
    revalidateCustomerPaths(active.orgSlug, customerId);
    return {
      ok: true,
      message: `${removed.firstName} ${removed.lastName} removed from household. Customer profile was not deleted.`,
      householdId,
      customerId
    };
  } catch {
    return householdDatabaseError("remove");
  }
}

export async function setPersistedHouseholdPrimaryContactAction(
  householdId: string,
  customerId: string
): Promise<HouseholdActionResult> {
  try {
    const active = await getActiveOrganizationContext();
    if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

    const household = await setHouseholdPrimaryContact(householdId, active.context.organization.id, customerId);
    if (!household) return { ok: false, message: "Primary contact must already belong to this household." };

    revalidateHouseholdPaths(active.orgSlug, householdId);
    revalidateCustomerPaths(active.orgSlug, customerId);
    return {
      ok: true,
      message: "Primary contact updated.",
      householdId,
      customerId
    };
  } catch {
    return householdDatabaseError("primaryContact");
  }
}
