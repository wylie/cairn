"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormActions, FormField, FormGrid, ToggleField } from "@/components/shared/form-layout";
import { useWorkstationState } from "@/lib/state/workstation-state";

export function InstructorManagement() {
  const { staffUsers, addInstructor, updateInstructor, toggleInstructorActive, hasPermission } = useWorkstationState();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [activeInstructor, setActiveInstructor] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState("");

  const canManage = hasPermission("manageStaff") || hasPermission("editPrograms");
  const instructors = useMemo(
    () => staffUsers.filter((entry) => entry.role === "instructor" || entry.canTeach),
    [staffUsers]
  );

  const editing = editingId ? instructors.find((entry) => entry.id === editingId) ?? null : null;

  const reset = () => {
    setEditingId(null);
    setFirstName("");
    setLastName("");
    setBio("");
    setActiveInstructor(true);
  };

  const openCreate = () => {
    reset();
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    const instructor = instructors.find((entry) => entry.id === id);
    if (!instructor) return;
    setEditingId(instructor.id);
    setFirstName(instructor.firstName);
    setLastName(instructor.lastName);
    setBio(instructor.instructorBio ?? "");
    setActiveInstructor(instructor.activeInstructor !== false);
    setFormOpen(true);
  };

  const submit = () => {
    if (!canManage) {
      setMessage("You do not have permission to perform this action.");
      return;
    }

    if (editing) {
      const result = updateInstructor({ id: editing.id, firstName, lastName, bio, activeInstructor });
      setMessage(result.message);
      if (result.ok) {
        setFormOpen(false);
        reset();
      }
      return;
    }

    const result = addInstructor({ firstName, lastName, bio, activeInstructor });
    setMessage(result.message);
    if (result.ok) {
      setFormOpen(false);
      reset();
    }
  };

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4" aria-label="instructor-management">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Instructor Management</h3>
        <Button onClick={openCreate}>Add Instructor</Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {isFormOpen ? (
        <div className="rounded-lg border bg-secondary/20 p-4" aria-label="instructor-form-panel">
          <h4 className="text-sm font-semibold">{editing ? "Edit Instructor" : "Add Instructor"}</h4>
          <FormGrid className="mt-3" label="instructor-form-layout">
            <FormField label="First name">
              <Input aria-label="Instructor first name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </FormField>
            <FormField label="Last name">
              <Input aria-label="Instructor last name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </FormField>
            <FormField label="Bio" className="md:col-span-2">
              <Input aria-label="Instructor bio" value={bio} onChange={(event) => setBio(event.target.value)} />
            </FormField>
            <ToggleField
              label="Active instructor"
              checked={activeInstructor}
              onChange={setActiveInstructor}
              ariaLabel="Instructor active"
              className="md:col-span-2"
            />
          </FormGrid>
          <FormActions>
            <Button onClick={submit}>{editing ? "Save Instructor" : "Create Instructor"}</Button>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Close</Button>
          </FormActions>
        </div>
      ) : null}

      <div className="space-y-2">
        {instructors.map((instructor) => (
          <article key={instructor.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">{instructor.firstName} {instructor.lastName}</p>
              <p className="text-muted-foreground">{instructor.activeInstructor === false ? "Inactive" : "Active"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button className="h-9" variant="outline" onClick={() => openEdit(instructor.id)}>Edit Instructor</Button>
              <Button className="h-9" variant="outline" onClick={() => setMessage(toggleInstructorActive(instructor.id).message)}>
                {instructor.activeInstructor === false ? "Activate" : "Deactivate"}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
