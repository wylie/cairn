"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
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

export async function checkInCustomerAction(formData: FormData) {
  const context = await resolveActionContext();
  if (!context) return;
  const customerId = String(formData.get("customerId") ?? "").trim();
  const override = String(formData.get("override") ?? "") === "true";
  const denialReason = String(formData.get("denialReason") ?? "").trim() || null;
  if (!customerId) return;
  await checkInCustomer({
    organizationId: context.organizationId,
    facilityId: context.facilityId,
    customerId,
    staffName: "Front Desk",
    override,
    denialReason
  });
  revalidatePath("/check-in");
  revalidatePath("/customers");
}

export async function checkOutCustomerAction(formData: FormData) {
  const context = await resolveActionContext();
  if (!context) return;
  const checkInId = String(formData.get("checkInId") ?? "").trim();
  if (!checkInId) return;
  await checkOutCustomer({
    organizationId: context.organizationId,
    checkInId,
    staffName: "Front Desk"
  });
  revalidatePath("/check-in");
  revalidatePath("/customers");
}
