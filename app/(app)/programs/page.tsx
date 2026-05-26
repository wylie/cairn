"use client";

import { ProgramCatalog } from "@/components/programs/program-catalog";
import { InstructorManagement } from "@/components/staff/instructor-management";
import { PageHeader } from "@/components/shared/page-header";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";

export default function ProgramsPage() {
  const { programs, sessions, createProgram, updateProgram } = useCustomerState();
  const { staffUsers } = useWorkstationState();
  const instructors = staffUsers.filter((entry) => entry.canTeach || entry.role === "instructor");

  return (
    <section className="space-y-4">
      <PageHeader
        title="Programs"
        description="Program and instructor setup. Session scheduling and registrations are managed from Calendar."
      />
      <ProgramCatalog
        programs={programs}
        sessions={sessions}
        instructors={instructors}
        onCreateProgram={createProgram}
        onUpdateProgram={updateProgram}
      />
      <InstructorManagement />
    </section>
  );
}
