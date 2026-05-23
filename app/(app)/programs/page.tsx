"use client";

import { ProgramCatalog } from "@/components/programs/program-catalog";
import { InstructorManagement } from "@/components/staff/instructor-management";
import { PageHeader } from "@/components/shared/page-header";
import { useCustomerState } from "@/lib/state/customer-state";

export default function ProgramsPage() {
  const { programs, sessions, createProgram, updateProgram } = useCustomerState();

  return (
    <section className="space-y-4">
      <PageHeader
        title="Programs"
        description="Program and instructor setup. Session scheduling and registrations are managed from Calendar."
      />
      <ProgramCatalog programs={programs} sessions={sessions} onCreateProgram={createProgram} onUpdateProgram={updateProgram} />
      <InstructorManagement />
    </section>
  );
}
