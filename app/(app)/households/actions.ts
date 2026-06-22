"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getActiveFacilityContext } from "@/db/tenant";
import {
  createHousehold,
  deleteHousehold,
  getHouseholdByOrganization,
  updateHousehold
} from "@/db/repositories/household-repository";

type HouseholdActionResult = {
  ok: boolean;
  message: string;
  householdId?: string;
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

export async function createPersistedHouseholdAction(input: PersistedHouseholdInput): Promise<HouseholdActionResult> {
  const active = await getActiveOrganizationContext();
  if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

  const name = input.name.trim();
  if (!name) return { ok: false, message: "Household name is required." };

  const householdId = `hh_${crypto.randomUUID()}`;
  const household = await createHousehold({
    id: householdId,
    organizationId: active.context.organization.id,
    name,
    primaryContactId: normalizeOptional(input.primaryContactId)
  });

  if (!household) return { ok: false, message: "Household could not be created in Neon." };

  revalidateHouseholdPaths(active.orgSlug, household.id);
  revalidatePath("/customers");
  revalidatePath(`/o/${active.orgSlug}/customers`);
  return { ok: true, message: "Household created in Neon.", householdId: household.id };
}

export async function updatePersistedHouseholdAction(
  householdId: string,
  input: PersistedHouseholdInput
): Promise<HouseholdActionResult> {
  const active = await getActiveOrganizationContext();
  if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

  const existing = await getHouseholdByOrganization(householdId, active.context.organization.id);
  if (!existing) return { ok: false, message: "Household not found for this organization." };

  const name = input.name.trim();
  if (!name) return { ok: false, message: "Household name is required." };

  const household = await updateHousehold(householdId, active.context.organization.id, {
    name,
    primaryContactId: normalizeOptional(input.primaryContactId)
  });

  if (!household) return { ok: false, message: "Household could not be updated in Neon." };

  revalidateHouseholdPaths(active.orgSlug, household.id);
  revalidatePath("/customers");
  revalidatePath(`/o/${active.orgSlug}/customers`);
  return { ok: true, message: "Household updated in Neon.", householdId: household.id };
}

export async function deletePersistedHouseholdAction(householdId: string): Promise<HouseholdActionResult> {
  const active = await getActiveOrganizationContext();
  if (!active) return { ok: false, message: "Database-backed organization context is unavailable." };

  const existing = await getHouseholdByOrganization(householdId, active.context.organization.id);
  if (!existing) return { ok: false, message: "Household not found for this organization." };

  const deleted = await deleteHousehold(householdId, active.context.organization.id);
  if (!deleted) return { ok: false, message: "Household could not be deleted from Neon." };

  revalidateHouseholdPaths(active.orgSlug, householdId);
  revalidatePath("/customers");
  revalidatePath(`/o/${active.orgSlug}/customers`);
  return { ok: true, message: "Household deleted from Neon." };
}
