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
  recurrence: "none" | "weekly" | "camp_weekdays";
  recurrenceCount: string;
  editScope: "single" | "future" | "series";
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
    notes: session.notes ?? "",
    recurrence: session.recurrenceRule?.startsWith("FREQ=WEEKLY")
      ? "weekly"
      : session.recurrenceRule?.startsWith("FREQ=DAILY")
        ? "camp_weekdays"
        : "none",
    recurrenceCount: "6",
    editScope: "single"
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
  notes: "",
  recurrence: "none",
  recurrenceCount: "6",
  editScope: "single"
};

export function SessionFormPanel({
  mode,
  session,
  programs,
  locations,
  instructors,
  warning,
  conflictWarning,
  onSave,
  onCancel,
  onCancelSession,
  initialValues
}: {
  mode: "create" | "edit";
  session?: ClassCampSession | null;
  programs: Program[];
  locations: Array<{ id: string; name: string }>;
  instructors: StaffUser[];
  warning?: string;
  conflictWarning?: string;
  onSave: (values: SessionFormValues) => void;
  onCancel: () => void;
  onCancelSession?: () => void;
  initialValues?: Partial<SessionFormValues>;
}) {
  const defaultProgramId = programs[0]?.id ?? "";
  const defaultCapacity = String(programs[0]?.defaultCapacity ?? 12);
  const defaultInstructorStaffId = programs[0]?.defaultInstructorId ?? "";

  const [values, setValues] = useState<SessionFormValues>(
    session
      ? fromSession(session)
      : {
          ...emptyValues,
          programId: defaultProgramId,
          locationId: locations[0]?.id ?? "",
          capacity: defaultCapacity,
          instructorStaffId: defaultInstructorStaffId
        }
  );
  const [capacityEdited, setCapacityEdited] = useState(false);
  const [instructorEdited, setInstructorEdited] = useState(false);
  const lastProgramIdRef = useRef<string>(values.programId);

  useEffect(() => {
    if (session) {
      setValues(fromSession(session));
      setCapacityEdited(true);
      setInstructorEdited(true);
      return;
    }
    const next = {
      ...emptyValues,
      programId: defaultProgramId,
      locationId: locations[0]?.id ?? "",
      capacity: defaultCapacity,
      instructorStaffId: defaultInstructorStaffId,
      ...initialValues
    };
    setValues(next);
    lastProgramIdRef.current = next.programId;
    setCapacityEdited(false);
    setInstructorEdited(false);
  }, [session, defaultProgramId, defaultCapacity, defaultInstructorStaffId, locations, initialValues]);

  useEffect(() => {
    if (mode !== "create") return;
    if (values.programId === lastProgramIdRef.current) return;
    const selectedProgram = programs.find((entry) => entry.id === values.programId);
    if (!capacityEdited && selectedProgram?.defaultCapacity) {
      setValues((prev) => ({ ...prev, capacity: String(selectedProgram.defaultCapacity) }));
    }
    if (!instructorEdited && selectedProgram?.defaultInstructorId) {
      setValues((prev) => ({ ...prev, instructorStaffId: selectedProgram.defaultInstructorId ?? "" }));
    }
    lastProgramIdRef.current = values.programId;
  }, [mode, values.programId, capacityEdited, instructorEdited, programs]);

  const title = mode === "create" ? "Create Session" : "Edit Session";
  const hasRegistrations = (session?.enrolled ?? 0) > 0 || (session?.waitlistCount ?? 0) > 0;

  const instructorName = useMemo(() => {
    const instructor = instructors.find((entry) => entry.id === values.instructorStaffId);
    return instructor ? `${instructor.firstName} ${instructor.lastName}` : "Unassigned";
  }, [instructors, values.instructorStaffId]);
  const selectedProgram = useMemo(() => programs.find((entry) => entry.id === values.programId), [programs, values.programId]);
  const hasInstructorOverride = Boolean(
    selectedProgram?.defaultInstructorId &&
      values.instructorStaffId &&
      values.instructorStaffId !== selectedProgram.defaultInstructorId
  );

  return (
    <section className="rounded-xl border bg-card p-4" aria-label="session-form-panel">
      <h3 className="text-base font-semibold">{title}</h3>
      {mode === "create" ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Program selection applies template defaults. Capacity can be adjusted per session.
        </p>
      ) : null}
      {warning ? <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p> : null}
      {conflictWarning ? <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{conflictWarning}</p> : null}
      {hasRegistrations && mode === "edit" ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This session has registrations. Changes affect enrolled and waitlisted customers.
        </p>
      ) : null}
      <FormGrid className="mt-3" label="session-form-layout">
        <FormField label="Session title override" helperText="Optional. Use only for special sessions or variations.">
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
          <select
            aria-label="Session instructor"
            value={values.instructorStaffId}
            onChange={(event) => {
              setInstructorEdited(true);
              setValues((prev) => ({ ...prev, instructorStaffId: event.target.value }));
            }}
            className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {instructors.map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.firstName} {staff.lastName}</option>
            ))}
          </select>
          {selectedProgram?.defaultInstructorId ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Default instructor: {(() => {
                const staff = instructors.find((entry) => entry.id === selectedProgram.defaultInstructorId);
                return staff ? `${staff.firstName} ${staff.lastName}` : "Assigned staff";
              })()}
              {hasInstructorOverride ? " (overridden for this session)" : ""}
            </p>
          ) : null}
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
        {mode === "create" ? (
          <>
            <FormField label="Recurrence pattern">
              <select
                aria-label="Session recurrence"
                value={values.recurrence}
                onChange={(event) => setValues((prev) => ({ ...prev, recurrence: event.target.value as SessionFormValues["recurrence"] }))}
                className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
              >
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="camp_weekdays">Weekdays (camp)</option>
              </select>
            </FormField>
            {values.recurrence !== "none" ? (
              <FormField label="Occurrences">
                <Input
                  aria-label="Session recurrence count"
                  value={values.recurrenceCount}
                  onChange={(event) => setValues((prev) => ({ ...prev, recurrenceCount: event.target.value }))}
                />
              </FormField>
            ) : null}
          </>
        ) : (
          <FormField label="Apply edits to">
            <select
              aria-label="Session edit scope"
              value={values.editScope}
              onChange={(event) => setValues((prev) => ({ ...prev, editScope: event.target.value as SessionFormValues["editScope"] }))}
              className="h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            >
              <option value="single">This session only</option>
              <option value="future">This + future</option>
              <option value="series">Entire series</option>
            </select>
          </FormField>
        )}
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
