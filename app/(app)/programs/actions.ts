"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProgram,
  createProgramSession,
  deleteProgram,
  setProgramSessionStatus,
  updateProgram,
  updateProgramSession,
  type ProgramInput,
  type ProgramSessionInput
} from "@/db/repositories/program-repository";
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

function parseNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateTime(day: string, time: string) {
  if (!day || !time) return new Date("invalid");
  return new Date(`${day}T${time}:00`);
}

function programRedirect(kind: "notice" | "error", message: string, extra?: Record<string, string | null | undefined>): never {
  const params = new URLSearchParams({ [kind]: message });
  Object.entries(extra ?? {}).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  redirect(`/programs?${params.toString()}`);
}

function readProgramInput(formData: FormData, context: NonNullable<Awaited<ReturnType<typeof resolveActionContext>>>): ProgramInput | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const capacity = parseNumber(formData.get("capacity")) ?? 0;
  const minimumAge = parseNumber(formData.get("minimumAge"));
  const maximumAge = parseNumber(formData.get("maximumAge"));
  const status = String(formData.get("status") ?? "active") as ProgramInput["status"];
  if (!name) return { error: "Program name is required." };
  if (!category) return { error: "Program category is required." };
  if (capacity < 0) return { error: "Capacity cannot be negative." };
  if (minimumAge != null && maximumAge != null && minimumAge > maximumAge) return { error: "Minimum age must be less than or equal to maximum age." };
  return {
    organizationId: context.organizationId,
    facilityId: context.facilityId,
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    category,
    capacity,
    minimumAge,
    maximumAge,
    status: ["active", "inactive", "archived"].includes(status ?? "") ? status : "active",
    waitlistEnabled: formData.get("waitlistEnabled") === "on"
  };
}

function readSessionInput(formData: FormData, context: NonNullable<Awaited<ReturnType<typeof resolveActionContext>>>): ProgramSessionInput | { error: string } {
  const programId = String(formData.get("programId") ?? "").trim();
  const startsAt = parseDateTime(String(formData.get("startsOn") ?? ""), String(formData.get("startsAt") ?? ""));
  const endsAt = parseDateTime(String(formData.get("endsOn") ?? formData.get("startsOn") ?? ""), String(formData.get("endsAt") ?? ""));
  const capacity = parseNumber(formData.get("capacity")) ?? 0;
  const status = String(formData.get("status") ?? "scheduled") as ProgramSessionInput["status"];
  if (!context.facilityId) return { error: "A facility is required before sessions can be created." };
  if (!programId) return { error: "Choose a program." };
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return { error: "Session start and end times are required." };
  if (endsAt <= startsAt) return { error: "Session end time must be after the start time." };
  if (capacity < 0) return { error: "Capacity cannot be negative." };
  return {
    organizationId: context.organizationId,
    facilityId: context.facilityId,
    programId,
    title: String(formData.get("title") ?? "").trim() || null,
    startsAt,
    endsAt,
    instructorStaffId: String(formData.get("instructorStaffId") ?? "").trim() || null,
    instructorName: String(formData.get("instructorName") ?? "").trim() || null,
    capacity,
    status: ["scheduled", "cancelled", "archived"].includes(status ?? "") ? status : "scheduled",
    waitlistEnabled: formData.get("waitlistEnabled") === "on"
  };
}

export async function createProgramAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) programRedirect("error", "Database-backed organization context is unavailable.");
  const input = readProgramInput(formData, context);
  if ("error" in input) programRedirect("error", input.error);
  const result = await createProgram(input);
  if (!result.ok) programRedirect("error", result.message);
  revalidatePath("/programs");
  programRedirect("notice", "Program created.", { programId: result.record.id });
}

export async function updateProgramAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) programRedirect("error", "Database-backed organization context is unavailable.");
  const programId = String(formData.get("programId") ?? "").trim();
  if (!programId) programRedirect("error", "Program was not selected.");
  const input = readProgramInput(formData, context);
  if ("error" in input) programRedirect("error", input.error, { programId });
  const result = await updateProgram(programId, context.organizationId, input);
  if (!result.ok) programRedirect("error", result.message, { programId });
  revalidatePath("/programs");
  programRedirect("notice", "Program saved.", { programId: result.record.id });
}

export async function deleteProgramAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) programRedirect("error", "Database-backed organization context is unavailable.");
  const programId = String(formData.get("programId") ?? "").trim();
  if (!programId) programRedirect("error", "Program was not selected.");
  const result = await deleteProgram(programId, context.organizationId);
  if (!result.ok) programRedirect("error", result.message, { programId });
  revalidatePath("/programs");
  programRedirect("notice", result.message ?? "Program deleted.", { programId: result.record.id });
}

export async function createProgramSessionAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) programRedirect("error", "Database-backed organization context is unavailable.");
  const input = readSessionInput(formData, context);
  if ("error" in input) programRedirect("error", input.error);
  const result = await createProgramSession(input);
  if (!result.ok) programRedirect("error", result.message, { programId: input.programId });
  revalidatePath("/programs");
  revalidatePath("/registrations");
  programRedirect("notice", "Session created.", { programId: result.record.programId, sessionId: result.record.id });
}

export async function updateProgramSessionAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) programRedirect("error", "Database-backed organization context is unavailable.");
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  if (!sessionId) programRedirect("error", "Session was not selected.");
  const input = readSessionInput(formData, context);
  if ("error" in input) programRedirect("error", input.error);
  const result = await updateProgramSession(sessionId, context.organizationId, input);
  if (!result.ok) programRedirect("error", result.message, { programId: input.programId, sessionId });
  revalidatePath("/programs");
  revalidatePath("/registrations");
  programRedirect("notice", "Session saved.", { programId: result.record.programId, sessionId: result.record.id });
}

export async function setProgramSessionStatusAction(formData: FormData): Promise<void> {
  const context = await resolveActionContext();
  if (!context) programRedirect("error", "Database-backed organization context is unavailable.");
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as "scheduled" | "cancelled" | "archived";
  if (!sessionId || !["scheduled", "cancelled", "archived"].includes(status)) programRedirect("error", "Choose a valid session status.");
  const result = await setProgramSessionStatus(sessionId, context.organizationId, status);
  if (!result.ok) programRedirect("error", result.message, { sessionId });
  revalidatePath("/programs");
  revalidatePath("/registrations");
  programRedirect("notice", `Session marked ${status}.`, { programId: result.record.programId, sessionId: result.record.id });
}
