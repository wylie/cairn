"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormActions, FormField, FormGrid, ToggleField } from "@/components/shared/form-layout";
import type { ClassCampSession, Program } from "@/types/domain";

interface ProgramFormValues {
  title: string;
  description: string;
  category: Program["category"];
  active: boolean;
  colorToken: NonNullable<Program["colorToken"]>;
  defaultCapacity: string;
  requiresWaiver: boolean;
  minimumAge: string;
  maximumAge: string;
}

const defaultForm: ProgramFormValues = {
  title: "",
  description: "",
  category: "class",
  active: true,
  colorToken: "blue",
  defaultCapacity: "12",
  requiresWaiver: true,
  minimumAge: "",
  maximumAge: ""
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
  onCreateProgram,
  onUpdateProgram
}: {
  programs: Program[];
  sessions: ClassCampSession[];
  onCreateProgram: (input: {
    title: string;
    description?: string;
    category: Program["category"];
    active: boolean;
    colorToken?: Program["colorToken"];
    defaultCapacity?: number;
    requiresWaiver?: boolean;
    minimumAge?: number;
    maximumAge?: number;
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
    minimumAge?: number;
    maximumAge?: number;
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
      active: program.active !== false,
      colorToken: program.colorToken ?? "blue",
      defaultCapacity: String(program.defaultCapacity ?? 12),
      requiresWaiver: program.requiresWaiver ?? true,
      minimumAge: typeof program.minimumAge === "number" ? String(program.minimumAge) : "",
      maximumAge: typeof program.maximumAge === "number" ? String(program.maximumAge) : ""
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
      active: form.active,
      colorToken: form.colorToken,
      defaultCapacity: Number(form.defaultCapacity),
      requiresWaiver: form.requiresWaiver,
      minimumAge: minAge,
      maximumAge: maxAge
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
              <FormField label="Minimum age">
                <Input aria-label="Program minimum age" value={form.minimumAge} onChange={(event) => setForm((prev) => ({ ...prev, minimumAge: event.target.value }))} />
              </FormField>
              <FormField label="Maximum age">
                <Input aria-label="Program maximum age" value={form.maximumAge} onChange={(event) => setForm((prev) => ({ ...prev, maximumAge: event.target.value }))} />
              </FormField>
              <ToggleField label="Active" checked={form.active} onChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))} ariaLabel="Program active" />
              <ToggleField label="Requires waiver" checked={form.requiresWaiver} onChange={(checked) => setForm((prev) => ({ ...prev, requiresWaiver: checked }))} ariaLabel="Program requires waiver" />
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
                <Badge variant={program.active === false ? "outline" : "secondary"}>{program.active === false ? "inactive" : program.category}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{count} session(s) • {formatAgeRange(program)}</p>
              <p className="text-sm text-muted-foreground">Default session capacity: {program.defaultCapacity ?? 12}</p>
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
