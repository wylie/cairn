"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getActiveFacilityContext } from "@/db/tenant";
import {
  createCustomer,
  deleteCustomer,
  getCustomerByOrganization,
  updateCustomer
} from "@/db/repositories/customer-repository";

type CustomerActionResult = {
  ok: boolean;
  message: string;
  customerId?: string;
};

export type PersistedCustomerInput = {
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  householdId?: string | null;
  active?: boolean;
};

async function getActiveOrganizationContext() {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  return context ? { orgSlug, context } : null;
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeCustomerInput(input: PersistedCustomerInput) {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    preferredName: normalizeOptional(input.preferredName),
    birthDate: normalizeOptional(input.dateOfBirth),
    email: normalizeOptional(input.email),
    phone: normalizeOptional(input.phone),
    householdId: input.householdId === undefined ? undefined : normalizeOptional(input.householdId),
    active: input.active ?? true
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
  if (!normalized.firstName || !normalized.lastName) {
    return { ok: false, message: "First and last name are required." };
  }

  const customerId = `cust_${crypto.randomUUID()}`;
  const customer = await createCustomer({
    id: customerId,
    organizationId: active.context.organization.id,
    ...normalized
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
  if (!normalized.firstName || !normalized.lastName) {
    return { ok: false, message: "First and last name are required." };
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
