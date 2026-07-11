"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createMembership,
  setMembershipStatus,
  updateMembership,
  type MembershipMutationInput
} from "@/db/repositories/membership-repository";
import { getActiveFacilityContext } from "@/db/tenant";

async function resolveActionContext() {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context || context.source !== "database") return null;
  return {
    organizationId: context.organization.id,
    facilityId: context.activeFacility?.id ?? context.facilities[0]?.id ?? null
  };
}

function readMembershipInput(formData: FormData, context: NonNullable<Awaited<ReturnType<typeof resolveActionContext>>>): MembershipMutationInput | { error: string } {
  const ownerType = String(formData.get("ownerType") ?? "customer") as "customer" | "household";
  const planId = String(formData.get("planId") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "").trim() || null;
  const householdId = String(formData.get("householdId") ?? "").trim() || null;
  const startsOn = String(formData.get("startsOn") ?? "").trim();
  const expiresOn = String(formData.get("expiresOn") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!planId) return { error: "Choose a membership plan." };
  if (!startsOn) return { error: "Start date is required." };
  if (expiresOn && expiresOn < startsOn) return { error: "Expiration date must be after the start date." };
  if (ownerType === "customer" && !customerId) return { error: "Choose a customer for this membership." };
  if (ownerType === "household" && !householdId) return { error: "Choose a household for this membership." };

  return {
    organizationId: context.organizationId,
    facilityId: context.facilityId,
    planId,
    ownerType,
    customerId: ownerType === "customer" ? customerId : customerId,
    householdId: ownerType === "household" ? householdId : null,
    startsOn,
    expiresOn,
    notes,
    status: "active"
  };
}

export async function createMembershipAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) return;
  const input = readMembershipInput(formData, context);
  if ("error" in input) return;

  try {
    const membership = await createMembership(input);
    if (!membership) return;
    revalidatePath("/memberships");
    revalidatePath("/customers");
  } catch {
    return;
  }
}

export async function updateMembershipAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) return;
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  if (!membershipId) return;
  const input = readMembershipInput(formData, context);
  if ("error" in input) return;

  try {
    const membership = await updateMembership(membershipId, context.organizationId, input);
    if (!membership) return;
    revalidatePath("/memberships");
    revalidatePath(`/customers/${membership.customerId ?? ""}`);
  } catch {
    return;
  }
}

export async function setMembershipStatusAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) return;
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as "active" | "expired" | "cancelled" | "suspended";
  if (!membershipId || !["active", "expired", "cancelled", "suspended"].includes(status)) return;
  await setMembershipStatus(membershipId, context.organizationId, status);
  revalidatePath("/memberships");
  revalidatePath("/check-in");
}
