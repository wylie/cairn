"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getActiveFacilityContext } from "@/db/tenant";
import {
  createCustomer,
  deleteCustomer,
  findDuplicateCustomers,
  getCustomerByOrganization,
  updateCustomer
} from "@/db/repositories/customer-repository";
import { normalizeCustomerInput, validateCustomerInput } from "@/lib/customer-validation";

type CustomerActionResult = {
  ok: boolean;
  message: string;
  customerId?: string;
  requiresConfirmation?: boolean;
  duplicateMatches?: Array<{
    customerId: string;
    name: string;
    matchedOn: string[];
  }>;
};

export type PersistedCustomerInput = {
  firstName: string;
  lastName: string;
  preferredName?: string;
  pronouns?: string;
  customPronouns?: string;
  memberId?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  profilePhotoUrl?: string;
  householdId?: string | null;
  active?: boolean;
  allowPotentialDuplicate?: boolean;
};

async function getActiveOrganizationContext() {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  return context ? { orgSlug, context } : null;
}

async function getDuplicateMessage(input: {
  organizationId: string;
  customer: ReturnType<typeof normalizeCustomerInput>;
  excludeCustomerId?: string;
}) {
  const duplicates = await findDuplicateCustomers({
    organizationId: input.organizationId,
    firstName: input.customer.firstName,
    lastName: input.customer.lastName,
    birthDate: input.customer.birthDate,
    email: input.customer.email,
    phone: input.customer.phone,
    excludeCustomerId: input.excludeCustomerId
  });
  if (duplicates.length === 0) return null;
  const matches = duplicates.map((duplicate) => ({
    customerId: duplicate.id,
    name: `${duplicate.firstName} ${duplicate.lastName}`,
    matchedOn: duplicate.matchedOn
  }));
  return {
    message: `Possible duplicate: ${matches[0].name} already exists. Review the existing profile, or save anyway if this is a separate customer.`,
    matches
  };
}

function revalidateCustomerPaths(orgSlug: string, customerId?: string) {
  revalidatePath("/customers");
  revalidatePath(`/o/${orgSlug}/customers`);
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/o/${orgSlug}/customers/${customerId}`);
  }
}

export async function createPersistedCustomerAction(input: PersistedCustomerInput): Promise<CustomerActionResult> {
  const active = await getActiveOrganizationContext();
  if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

  const normalized = normalizeCustomerInput(input);
  const validation = validateCustomerInput(normalized);
  if (!validation.ok) return { ok: false, message: validation.message };

  const duplicate = await getDuplicateMessage({
    organizationId: active.context.organization.id,
    customer: normalized
  });
  if (duplicate && !input.allowPotentialDuplicate) {
    return {
      ok: false,
      message: duplicate.message,
      requiresConfirmation: true,
      duplicateMatches: duplicate.matches
    };
  }

  const customerId = `cust_${crypto.randomUUID()}`;
  const customer = await createCustomer({
    id: customerId,
    organizationId: active.context.organization.id,
    ...normalized,
    memberId: normalized.memberId ?? customerId.replace(/^cust_/, "M-").slice(0, 16)
  });

  if (!customer) return { ok: false, message: "Customer could not be created in Neon." };

  revalidateCustomerPaths(active.orgSlug, customer.id);
  return { ok: true, message: "Customer created in Neon.", customerId: customer.id };
}

export async function updatePersistedCustomerAction(
  customerId: string,
  input: PersistedCustomerInput
): Promise<CustomerActionResult> {
  const active = await getActiveOrganizationContext();
  if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

  const existing = await getCustomerByOrganization(customerId, active.context.organization.id);
  if (!existing) return { ok: false, message: "Customer not found for this organization." };

  const normalized = normalizeCustomerInput(input);
  const validation = validateCustomerInput(normalized);
  if (!validation.ok) return { ok: false, message: validation.message };

  const duplicate = await getDuplicateMessage({
    organizationId: active.context.organization.id,
    customer: normalized,
    excludeCustomerId: customerId
  });
  if (duplicate && !input.allowPotentialDuplicate) {
    return {
      ok: false,
      message: duplicate.message,
      requiresConfirmation: true,
      duplicateMatches: duplicate.matches
    };
  }

  const customer = await updateCustomer(customerId, active.context.organization.id, normalized);
  if (!customer) return { ok: false, message: "Customer could not be updated in Neon." };

  revalidateCustomerPaths(active.orgSlug, customer.id);
  return { ok: true, message: "Customer updated in Neon.", customerId: customer.id };
}

export async function deletePersistedCustomerAction(customerId: string): Promise<CustomerActionResult> {
  const active = await getActiveOrganizationContext();
  if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

  const existing = await getCustomerByOrganization(customerId, active.context.organization.id);
  if (!existing) return { ok: false, message: "Customer not found for this organization." };

  const deleted = await deleteCustomer(customerId, active.context.organization.id);
  if (!deleted) return { ok: false, message: "Customer could not be deleted from Neon." };

  revalidateCustomerPaths(active.orgSlug, customerId);
  return { ok: true, message: "Customer deleted from Neon." };
}
