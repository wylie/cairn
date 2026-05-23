import { useEffect, useMemo, useRef, useState } from "react";
import type { ClassCampSession, Program, StaffUser } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormActions, FormField, FormGrid, ToggleField } from "@/components/shared/form-layout";

interface SessionFormValues {
  title: string;
  programId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  instructorStaffId: string;
  capacity: string;
  waitlistEnabled: boolean;
  notes: string;
}

function fromSession(session: ClassCampSession): SessionFormValues {
  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  return {
    title: session.title ?? "",
    programId: session.programId,
    locationId: session.locationId,
    date: session.startsAt.slice(0, 10),
    startTime: start.toISOString().slice(11, 16),
    endTime: end.toISOString().slice(11, 16),
    instructorStaffId: session.instructorStaffId ?? "",
    capacity: String(session.capacity),
    waitlistEnabled: session.waitlistEnabled ?? false,
    notes: session.notes ?? ""
  };
}

const emptyValues: SessionFormValues = {
  title: "",
  programId: "",
  locationId: "",
  date: "",
  startTime: "",
  endTime: "",
  instructorStaffId: "",
  capacity: "12",
  waitlistEnabled: true,
  notes: ""
};

export function SessionFormPanel({
  mode,
  session,
  programs,
  locations,
  instructors,
  warning,
  onSave,
  onCancel,
  onCancelSession
}: {
  mode: "create" | "edit";
  session?: ClassCampSession | null;
  programs: Program[];
  locations: Array<{ id: string; name: string }>;
  instructors: StaffUser[];
  warning?: string;
  onSave: (values: SessionFormValues) => void;
  onCancel: () => void;
  onCancelSession?: () => void;
}) {
  const defaultProgramId = programs[0]?.id ?? "";
  const defaultCapacity = String(programs[0]?.defaultCapacity ?? 12);

  const [values, setValues] = useState<SessionFormValues>(
    session
      ? fromSession(session)
      : { ...emptyValues, programId: defaultProgramId, locationId: locations[0]?.id ?? "", capacity: defaultCapacity }
  );
  const [capacityEdited, setCapacityEdited] = useState(false);
  const lastProgramIdRef = useRef<string>(values.programId);

  useEffect(() => {
    if (session) {
      setValues(fromSession(session));
      setCapacityEdited(true);
      return;
    }
    const next = {
      ...emptyValues,
      programId: defaultProgramId,
      locationId: locations[0]?.id ?? "",
      capacity: defaultCapacity
    };
    setValues(next);
    lastProgramIdRef.current = next.programId;
    setCapacityEdited(false);
  }, [session, defaultProgramId, defaultCapacity, locations]);

  useEffect(() => {
    if (mode !== "create") return;
    if (values.programId === lastProgramIdRef.current) return;
    const selectedProgram = programs.find((entry) => entry.id === values.programId);
    if (!capacityEdited && selectedProgram?.defaultCapacity) {
      setValues((prev) => ({ ...prev, capacity: String(selectedProgram.defaultCapacity) }));
    }
    lastProgramIdRef.current = values.programId;
  }, [mode, values.programId, capacityEdited, programs]);

  const title = mode === "create" ? "Create Session" : "Edit Session";
  const hasRegistrations = (session?.enrolled ?? 0) > 0 || (session?.waitlistCount ?? 0) > 0;

  const instructorName = useMemo(() => {
    const instructor = instructors.find((entry) => entry.id === values.instructorStaffId);
    return instructor ? `${instructor.firstName} ${instructor.lastName}` : "Unassigned";
  }, [instructors, values.instructorStaffId]);

  return (
    <section className="rounded-xl border bg-card p-4" aria-label="session-form-panel">
      <h3 className="text-base font-semibold">{title}</h3>
      {mode === "create" ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Program selection applies template defaults. Capacity can be adjusted per session.
        </p>
      ) : null}
      {warning ? <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p> : null}
      {hasRegistrations && mode === "edit" ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This session has registrations. Changes affect enrolled and waitlisted customers.
        </p>
      ) : null}
      <FormGrid className="mt-3" label="session-form-layout">
        <FormField label="Title">
          <Input aria-label="Session title" value={values.title} onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))} />
        </FormField>
        <FormField label="Program">
          <select aria-label="Session program" value={values.programId} onChange={(event) => setValues((prev) => ({ ...prev, programId: event.target.value }))} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
            <option value="">Select program</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>{program.title}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Date">
          <Input aria-label="Session date" type="date" value={values.date} onChange={(event) => setValues((prev) => ({ ...prev, date: event.target.value }))} />
        </FormField>
        <div className="grid gap-2 sm:grid-cols-2">
          <FormField label="Start">
            <Input aria-label="Session start time" type="time" value={values.startTime} onChange={(event) => setValues((prev) => ({ ...prev, startTime: event.target.value }))} />
          </FormField>
          <FormField label="End">
            <Input aria-label="Session end time" type="time" value={values.endTime} onChange={(event) => setValues((prev) => ({ ...prev, endTime: event.target.value }))} />
          </FormField>
        </div>
        <FormField label="Instructor">
          <select aria-label="Session instructor" value={values.instructorStaffId} onChange={(event) => setValues((prev) => ({ ...prev, instructorStaffId: event.target.value }))} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {instructors.map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Session capacity">
          <Input
            aria-label="Session capacity"
            value={values.capacity}
            onChange={(event) => {
              setCapacityEdited(true);
              setValues((prev) => ({ ...prev, capacity: event.target.value }));
            }}
          />
        </FormField>
        <FormField label="Location">
          <select aria-label="Session location" value={values.locationId} onChange={(event) => setValues((prev) => ({ ...prev, locationId: event.target.value }))} className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </FormField>
        <ToggleField
          label="Waitlist enabled"
          checked={values.waitlistEnabled}
          onChange={(checked) => setValues((prev) => ({ ...prev, waitlistEnabled: checked }))}
          ariaLabel="Session waitlist enabled"
        />
        <FormField label="Notes" className="md:col-span-2">
          <textarea aria-label="Session notes" value={values.notes} onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))} className="min-h-20 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" />
        </FormField>
      </FormGrid>
      <p className="mt-2 text-xs text-muted-foreground">Instructor preview: {instructorName}</p>
      <FormActions>
        <Button onClick={() => onSave(values)}>{mode === "create" ? "Create Session" : "Save Changes"}</Button>
        <Button variant="outline" onClick={onCancel}>Close</Button>
        {mode === "edit" ? (
          <Button variant="destructive" onClick={onCancelSession}>
            Cancel Session
          </Button>
        ) : null}
      </FormActions>
    </section>
  );
}
