"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  markRegistrationAttendance,
  registerCustomerForSession,
  removeRegistration
} from "@/db/repositories/program-repository";
import { getActiveFacilityContext } from "@/db/tenant";

async function resolveActionContext() {
  const store = await cookies();
  const orgSlug = store.get("cairn_org_slug")?.value ?? "summit";
  const context = await getActiveFacilityContext(orgSlug);
  if (!context || context.source !== "database") return null;
  return { organizationId: context.organization.id };
}

function registrationRedirect(kind: "notice" | "error", message: string, extra?: Record<string, string | null | undefined>): never {
  const params = new URLSearchParams({ [kind]: message });
  Object.entries(extra ?? {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  redirect(`/registrations?${params.toString()}`);
}

export async function registerCustomerForSessionAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) registrationRedirect("error", "Database-backed organization context is unavailable.");
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const forceWaitlist = formData.get("forceWaitlist") === "on";
  const result = await registerCustomerForSession({ organizationId: context.organizationId, sessionId, customerId, forceWaitlist });
  if (!result.ok) registrationRedirect("error", result.message, { sessionId });
  revalidatePath("/registrations");
  revalidatePath("/programs");
  revalidatePath(`/customers/${customerId}`);
  registrationRedirect("notice", result.message ?? "Registration saved.", { sessionId, registrationId: result.record.id });
}

export async function removeRegistrationAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) registrationRedirect("error", "Database-backed organization context is unavailable.");
  const registrationId = String(formData.get("registrationId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const result = await removeRegistration(registrationId, context.organizationId);
  if (!result.ok) registrationRedirect("error", result.message, { sessionId });
  revalidatePath("/registrations");
  revalidatePath("/programs");
  if (customerId) revalidatePath(`/customers/${customerId}`);
  registrationRedirect("notice", "Registration removed.", { sessionId });
}

export async function markRegistrationAttendanceAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) registrationRedirect("error", "Database-backed organization context is unavailable.");
  const registrationId = String(formData.get("registrationId") ?? "").trim();
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as "attended" | "absent";
  if (!["attended", "absent"].includes(status)) registrationRedirect("error", "Choose a valid attendance status.", { sessionId });
  const result = await markRegistrationAttendance(registrationId, context.organizationId, status);
  if (!result.ok) registrationRedirect("error", result.message, { sessionId });
  revalidatePath("/registrations");
  revalidatePath("/programs");
  revalidatePath(`/customers/${result.record.customerId}`);
  registrationRedirect("notice", `Registration marked ${status}.`, { sessionId, registrationId });
}
