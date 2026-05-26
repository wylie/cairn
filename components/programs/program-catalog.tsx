"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormActions, FormField, FormGrid, ToggleField } from "@/components/shared/form-layout";
import type { ClassCampSession, Program, StaffUser } from "@/types/domain";

interface ProgramFormValues {
  title: string;
  description: string;
  category: Program["category"];
  programType: NonNullable<Program["programType"]>;
  active: boolean;
  colorToken: NonNullable<Program["colorToken"]>;
  defaultCapacity: string;
  requiresWaiver: boolean;
  guardianRequired: boolean;
  memberRequired: boolean;
  dropInAllowed: boolean;
  defaultInstructorId: string;
  pricingModel: NonNullable<Program["pricingModel"]>;
  basePriceCents: string;
  waitlistEnabled: boolean;
  minimumAge: string;
  maximumAge: string;
  tags: string;
}

const defaultForm: ProgramFormValues = {
  title: "",
  description: "",
  category: "class",
  programType: "recurring_class",
  active: true,
  colorToken: "blue",
  defaultCapacity: "12",
  requiresWaiver: true,
  guardianRequired: false,
  memberRequired: false,
  dropInAllowed: true,
  defaultInstructorId: "",
  pricingModel: "paid_registration",
  basePriceCents: "0",
  waitlistEnabled: true,
  minimumAge: "",
  maximumAge: "",
  tags: ""
};

function formatAgeRange(program: Program) {
  const min = program.minimumAge;
  const max = program.maximumAge;
  if (typeof min !== "number" && typeof max !== "number") return "All ages";
  if (typeof min === "number" && typeof max !== "number") return `Ages ${min}+`;
  if (typeof min !== "number" && typeof max === "number") return `Up to age ${max}`;
  if (min === max) return `Age ${min}`;
  return `Ages ${min}-${max}`;
}

export function ProgramCatalog({
  programs,
  sessions,
  instructors,
  onCreateProgram,
  onUpdateProgram
}: {
  programs: Program[];
  sessions: ClassCampSession[];
  instructors: StaffUser[];
  onCreateProgram: (input: {
    title: string;
    description?: string;
    category: Program["category"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    guardianRequired?: boolean;
    memberRequired?: boolean;
    dropInAllowed?: boolean;
    defaultInstructorId?: string;
    pricingModel?: Program["pricingModel"];
    basePriceCents?: number;
    waitlistEnabled?: boolean;
    minimumAge?: number;
    maximumAge?: number;
    tags?: string[];
  }) => { ok: boolean; message: string };
  onUpdateProgram: (input: {
    id: string;
    title: string;
    description?: string;
    category: Program["category"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    guardianRequired?: boolean;
    memberRequired?: boolean;
    dropInAllowed?: boolean;
    defaultInstructorId?: string;
    pricingModel?: Program["pricingModel"];
    basePriceCents?: number;
    waitlistEnabled?: boolean;
    minimumAge?: number;
    maximumAge?: number;
    tags?: string[];
  }) => { ok: boolean; message: string };
}) {
  const [form, setForm] = useState<ProgramFormValues>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState("");

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setFormOpen(true);
  };

  const openEdit = (program: Program) => {
    setEditingId(program.id);
    setForm({
      title: program.title,
      description: program.description ?? "",
      category: program.category,
      programType: program.programType ?? "recurring_class",
      active: program.active !== false,
      colorToken: program.colorToken ?? "blue",
      defaultCapacity: String(program.defaultCapacity ?? 12),
      requiresWaiver: program.requiresWaiver ?? true,
      guardianRequired: Boolean(program.guardianRequired),
      memberRequired: Boolean(program.memberRequired),
      dropInAllowed: program.dropInAllowed !== false,
      defaultInstructorId: program.defaultInstructorId ?? "",
      pricingModel: program.pricingModel ?? "paid_registration",
      basePriceCents: String(program.basePriceCents ?? 0),
      waitlistEnabled: program.waitlistEnabled !== false,
      minimumAge: typeof program.minimumAge === "number" ? String(program.minimumAge) : "",
      maximumAge: typeof program.maximumAge === "number" ? String(program.maximumAge) : "",
      tags: (program.tags ?? []).join(", ")
    });
    setFormOpen(true);
  };

  const submit = () => {
    const minAge = form.minimumAge.trim() ? Number(form.minimumAge) : undefined;
    const maxAge = form.maximumAge.trim() ? Number(form.maximumAge) : undefined;

    if (typeof minAge === "number" && !Number.isFinite(minAge)) {
      setMessage("Enter a valid minimum age.");
      return;
    }
    if (typeof maxAge === "number" && !Number.isFinite(maxAge)) {
      setMessage("Enter a valid maximum age.");
      return;
    }
    if (typeof minAge === "number" && typeof maxAge === "number" && maxAge < minAge) {
      setMessage("Maximum age must be greater than or equal to minimum age.");
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      programType: form.programType,
      active: form.active,
      colorToken: form.colorToken,
      defaultCapacity: Number(form.defaultCapacity),
      requiresWaiver: form.requiresWaiver,
      guardianRequired: form.guardianRequired,
      memberRequired: form.memberRequired,
      dropInAllowed: form.dropInAllowed,
      defaultInstructorId: form.defaultInstructorId || undefined,
      pricingModel: form.pricingModel,
      basePriceCents: Number(form.basePriceCents || "0"),
      waitlistEnabled: form.waitlistEnabled,
      minimumAge: minAge,
      maximumAge: maxAge,
      tags: form.tags
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    };

    const result = editingId ? onUpdateProgram({ id: editingId, ...payload }) : onCreateProgram(payload);
    setMessage(result.message);
    if (result.ok) {
      setFormOpen(false);
      setEditingId(null);
      setForm(defaultForm);
    }
  };

  const programCards = useMemo(
    () =>
      programs.map((program) => {
        const count = sessions.filter((entry) => entry.programId === program.id).length;
        return { program, count };
      }),
    [programs, sessions]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Program Catalog</CardTitle>
        <Button onClick={openCreate}>Add Program</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

        {isFormOpen ? (
          <section className="rounded-lg border bg-secondary/20 p-4" aria-label="program-form-panel">
            <h4 className="text-sm font-semibold">{editingId ? "Edit Program" : "Add Program"}</h4>
            <FormGrid label="program-form-layout" className="mt-3">
              <FormField label="Program name">
                <Input aria-label="Program name" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              </FormField>
              <FormField label="Category">
                <select aria-label="Program category" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as Program["category"] }))} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                  <option value="class">Class</option>
                  <option value="camp">Camp</option>
                  <option value="clinic">Clinic</option>
                  <option value="course">Course</option>
                </select>
              </FormField>
              <FormField label="Program type">
                <select aria-label="Program type" value={form.programType} onChange={(event) => setForm((prev) => ({ ...prev, programType: event.target.value as NonNullable<Program["programType"]> }))} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                  <option value="recurring_class">Recurring Class</option>
                  <option value="one_time_event">One-time Event</option>
                  <option value="camp">Camp</option>
                  <option value="clinic">Clinic</option>
                  <option value="team_league">Team/League or Seasonal</option>
                  <option value="appointment_session">Appointment Session</option>
                </select>
              </FormField>
              <FormField label="Description" className="md:col-span-2">
                <Input aria-label="Program description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </FormField>
              <FormField label="Color token">
                <select aria-label="Program color token" value={form.colorToken} onChange={(event) => setForm((prev) => ({ ...prev, colorToken: event.target.value as NonNullable<Program["colorToken"]> }))} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="amber">Amber</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                  <option value="slate">Slate</option>
                  <option value="gray">Gray</option>
                </select>
              </FormField>
              <FormField label="Default session capacity">
                <Input aria-label="Program default session capacity" value={form.defaultCapacity} onChange={(event) => setForm((prev) => ({ ...prev, defaultCapacity: event.target.value }))} />
              </FormField>
              <FormField label="Base price (cents)">
                <Input aria-label="Program base price cents" value={form.basePriceCents} onChange={(event) => setForm((prev) => ({ ...prev, basePriceCents: event.target.value }))} />
              </FormField>
              <FormField label="Minimum age">
                <Input aria-label="Program minimum age" value={form.minimumAge} onChange={(event) => setForm((prev) => ({ ...prev, minimumAge: event.target.value }))} />
              </FormField>
              <FormField label="Maximum age">
                <Input aria-label="Program maximum age" value={form.maximumAge} onChange={(event) => setForm((prev) => ({ ...prev, maximumAge: event.target.value }))} />
              </FormField>
              <ToggleField label="Active" checked={form.active} onChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))} ariaLabel="Program active" />
              <ToggleField label="Requires waiver" checked={form.requiresWaiver} onChange={(checked) => setForm((prev) => ({ ...prev, requiresWaiver: checked }))} ariaLabel="Program requires waiver" />
              <ToggleField label="Guardian required" checked={form.guardianRequired} onChange={(checked) => setForm((prev) => ({ ...prev, guardianRequired: checked }))} ariaLabel="Program guardian required" />
              <ToggleField label="Member required" checked={form.memberRequired} onChange={(checked) => setForm((prev) => ({ ...prev, memberRequired: checked }))} ariaLabel="Program member required" />
              <ToggleField label="Drop-ins allowed" checked={form.dropInAllowed} onChange={(checked) => setForm((prev) => ({ ...prev, dropInAllowed: checked }))} ariaLabel="Program drop in allowed" />
              <ToggleField label="Waitlist enabled" checked={form.waitlistEnabled} onChange={(checked) => setForm((prev) => ({ ...prev, waitlistEnabled: checked }))} ariaLabel="Program waitlist enabled" />
              <FormField label="Default instructor">
                <select aria-label="Program default instructor" value={form.defaultInstructorId} onChange={(event) => setForm((prev) => ({ ...prev, defaultInstructorId: event.target.value }))} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                  <option value="">None</option>
                  {instructors.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Pricing">
                <select aria-label="Program pricing model" value={form.pricingModel} onChange={(event) => setForm((prev) => ({ ...prev, pricingModel: event.target.value as NonNullable<Program["pricingModel"]> }))} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
                  <option value="free">Free</option>
                  <option value="included_membership">Included with membership</option>
                  <option value="paid_registration">Paid registration</option>
                  <option value="drop_in_fee">Drop-in fee</option>
                </select>
              </FormField>
              <FormField label="Tags" className="md:col-span-2">
                <Input aria-label="Program tags" placeholder="youth, climbing, seasonal" value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} />
              </FormField>
            </FormGrid>
            <FormActions>
              <Button onClick={submit}>{editingId ? "Save Program" : "Create Program"}</Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Close</Button>
            </FormActions>
          </section>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {programCards.map(({ program, count }) => (
            <article key={program.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{program.title}</p>
                <Badge tone={program.active === false ? "muted" : "default"}>{program.active === false ? "inactive" : program.category}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{count} session(s) • {formatAgeRange(program)}</p>
              <p className="text-sm text-muted-foreground">Type: {program.programType?.replace(/_/g, " ") ?? "recurring class"}</p>
              <p className="text-sm text-muted-foreground">Default session capacity: {program.defaultCapacity ?? 12}</p>
              <p className="text-sm text-muted-foreground">Pricing: {program.pricingModel?.replace(/_/g, " ") ?? "paid registration"}</p>
              <p className="text-sm text-muted-foreground">Waitlist: {program.waitlistEnabled === false ? "Off" : "On"}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button className="h-9" variant="outline" onClick={() => openEdit(program)}>Edit Program</Button>
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
