"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createMembership,
  extendMembership,
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
  const status = String(formData.get("status") ?? "active").trim() as MembershipMutationInput["status"];
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!planId) return { error: "Choose a membership plan." };
  if (!startsOn) return { error: "Start date is required." };
  if (expiresOn && expiresOn < startsOn) return { error: "Expiration date must be on or after the start date." };
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
    status: ["active", "expired", "cancelled", "suspended"].includes(status ?? "") ? status : "active"
  };
}

function membershipRedirect(kind: "notice" | "error", message: string, membershipId?: string | null): never {
  const params = new URLSearchParams({ [kind]: message });
  if (membershipId) params.set("membershipId", membershipId);
  redirect(`/memberships?${params.toString()}`);
}

export async function createMembershipAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) membershipRedirect("error", "Database-backed organization context is unavailable.");
  const input = readMembershipInput(formData, context);
  if ("error" in input) membershipRedirect("error", input.error);

  const result = await (async () => {
    try {
      return await createMembership(input);
    } catch {
      return { ok: false as const, message: "Membership could not be created. Check the database status and try again." };
    }
  })();
  if (!result.ok) membershipRedirect("error", result.message);
  revalidatePath("/memberships");
  revalidatePath("/customers");
  membershipRedirect("notice", "Membership created.", result.membership.id);
}

export async function updateMembershipAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) membershipRedirect("error", "Database-backed organization context is unavailable.");
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  if (!membershipId) membershipRedirect("error", "Membership was not selected.");
  const input = readMembershipInput(formData, context);
  if ("error" in input) membershipRedirect("error", input.error, membershipId);

  const result = await (async () => {
    try {
      return await updateMembership(membershipId, context.organizationId, input);
    } catch {
      return { ok: false as const, message: "Membership could not be saved. Check the database status and try again." };
    }
  })();
  if (!result.ok) membershipRedirect("error", result.message, membershipId);
  revalidatePath("/memberships");
  revalidatePath(`/customers/${result.membership.customerId ?? ""}`);
  membershipRedirect("notice", "Membership saved.", result.membership.id);
}

export async function setMembershipStatusAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) membershipRedirect("error", "Database-backed organization context is unavailable.");
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as "active" | "expired" | "cancelled" | "suspended";
  if (!membershipId || !["active", "expired", "cancelled", "suspended"].includes(status)) membershipRedirect("error", "Choose a valid membership status.", membershipId);
  const result = await setMembershipStatus(membershipId, context.organizationId, status);
  if (!result.ok) membershipRedirect("error", result.message, membershipId);
  revalidatePath("/memberships");
  revalidatePath("/check-in");
  membershipRedirect("notice", `Membership marked ${status}.`, result.membership.id);
}

export async function extendMembershipAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) membershipRedirect("error", "Database-backed organization context is unavailable.");
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const daysValue = Number.parseInt(String(formData.get("days") ?? "30"), 10);
  const days = Number.isFinite(daysValue) ? daysValue : 30;
  if (!membershipId) membershipRedirect("error", "Membership was not selected.");

  const result = await (async () => {
    try {
      return await extendMembership(membershipId, context.organizationId, days);
    } catch {
      return { ok: false as const, message: "Membership could not be extended. Check the database status and try again." };
    }
  })();
  if (!result.ok) membershipRedirect("error", result.message, membershipId);
  revalidatePath("/memberships");
  revalidatePath("/check-in");
  revalidatePath(`/customers/${result.membership.customerId ?? ""}`);
  membershipRedirect("notice", `Membership extended ${Math.max(1, days)} days.`, result.membership.id);
}
