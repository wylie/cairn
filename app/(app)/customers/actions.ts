"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getActiveFacilityContext } from "@/db/tenant";
import {
  createCustomer,
  deleteCustomer,
  findDuplicateCustomer,
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
    pronouns: normalizeOptional(input.pronouns),
    customPronouns: normalizeOptional(input.customPronouns),
    memberId: normalizeOptional(input.memberId),
    birthDate: normalizeOptional(input.dateOfBirth),
    email: normalizeOptional(input.email),
    phone: normalizeOptional(input.phone),
    addressLine1: normalizeOptional(input.addressLine1),
    addressLine2: normalizeOptional(input.addressLine2),
    city: normalizeOptional(input.city),
    state: normalizeOptional(input.state),
    postalCode: normalizeOptional(input.postalCode),
    emergencyContactName: normalizeOptional(input.emergencyContactName),
    emergencyContactPhone: normalizeOptional(input.emergencyContactPhone),
    notes: normalizeOptional(input.notes),
    profilePhotoUrl: normalizeOptional(input.profilePhotoUrl),
    householdId: input.householdId === undefined ? undefined : normalizeOptional(input.householdId),
    active: input.active ?? true
  };
}

function validateCustomerInput(input: ReturnType<typeof normalizeCustomerInput>) {
  if (!input.firstName || !input.lastName) return "First and last name are required.";
  if (!input.birthDate) return "Date of birth is required.";
  if (!input.phone) return "Phone is required.";
  if (!input.addressLine1) return "Address line 1 is required.";
  if (!input.city) return "City is required.";
  if (!input.state) return "State is required.";
  if (!input.postalCode) return "ZIP/postal code is required.";
  if (!input.emergencyContactName) return "Emergency contact name is required.";
  if (!input.emergencyContactPhone) return "Emergency contact phone is required.";
  return "";
}

async function getDuplicateMessage(input: {
  organizationId: string;
  customer: ReturnType<typeof normalizeCustomerInput>;
  excludeCustomerId?: string;
}) {
  const duplicate = await findDuplicateCustomer({
    organizationId: input.organizationId,
    firstName: input.customer.firstName,
    lastName: input.customer.lastName,
    birthDate: input.customer.birthDate,
    email: input.customer.email,
    phone: input.customer.phone,
    excludeCustomerId: input.excludeCustomerId
  });
  if (!duplicate) return "";
  return `Possible duplicate: ${duplicate.firstName} ${duplicate.lastName} already exists. Review the existing profile before saving.`;
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
  const validationMessage = validateCustomerInput(normalized);
  if (validationMessage) return { ok: false, message: validationMessage };

  const duplicateMessage = await getDuplicateMessage({
    organizationId: active.context.organization.id,
    customer: normalized
  });
  if (duplicateMessage) return { ok: false, message: duplicateMessage };

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
  const validationMessage = validateCustomerInput(normalized);
  if (validationMessage) return { ok: false, message: validationMessage };

  const duplicateMessage = await getDuplicateMessage({
    organizationId: active.context.organization.id,
    customer: normalized,
    excludeCustomerId: customerId
  });
  if (duplicateMessage) return { ok: false, message: duplicateMessage };

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
