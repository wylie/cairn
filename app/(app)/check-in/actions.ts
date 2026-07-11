"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkInCustomer, checkOutCustomer } from "@/db/repositories/check-in-repository";
import { getActiveFacilityContext } from "@/db/tenant";

async function resolveActionContext() {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context || context.source !== "database") return null;
  const facilityId = context.activeFacility?.id ?? context.facilities[0]?.id ?? null;
  if (!facilityId) return null;
  return {
    organizationId: context.organization.id,
    facilityId
  };
}

function checkInRedirect(kind: "notice" | "error", message: string, query?: string | null): never {
  const params = new URLSearchParams({ [kind]: message });
  if (query) params.set("q", query);
  redirect(`/check-in?${params.toString()}`);
}

export async function checkInCustomerAction(formData: FormData) {
  const context = await resolveActionContext();
  if (!context) checkInRedirect("error", "Database-backed facility context is unavailable.");
  const customerId = String(formData.get("customerId") ?? "").trim();
  const searchQuery = String(formData.get("searchQuery") ?? "").trim();
  const override = String(formData.get("override") ?? "") === "true";
  const denialReason = String(formData.get("denialReason") ?? "").trim() || null;
  if (!customerId) checkInRedirect("error", "Choose a customer before checking in.", searchQuery);
  const result = await checkInCustomer({
    organizationId: context.organizationId,
    facilityId: context.facilityId,
    customerId,
    staffName: "Front Desk",
    override,
    denialReason
  });
  revalidatePath("/check-in");
  revalidatePath("/customers");
  if (!result.ok) checkInRedirect("error", result.message, searchQuery);
  checkInRedirect("notice", override ? "Check-in recorded with staff override." : "Check-in recorded.", searchQuery);
}

export async function checkOutCustomerAction(formData: FormData) {
  const context = await resolveActionContext();
  if (!context) checkInRedirect("error", "Database-backed facility context is unavailable.");
  const checkInId = String(formData.get("checkInId") ?? "").trim();
  const searchQuery = String(formData.get("searchQuery") ?? "").trim();
  if (!checkInId) checkInRedirect("error", "Choose an active check-in before checking out.", searchQuery);
  const result = await checkOutCustomer({
    organizationId: context.organizationId,
    checkInId,
    staffName: "Front Desk"
  });
  revalidatePath("/check-in");
  revalidatePath("/customers");
  if (!result.ok) checkInRedirect("error", result.message, searchQuery);
  checkInRedirect("notice", "Check-out recorded.", searchQuery);
}
