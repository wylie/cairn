import { CalendarCard } from "@/components/calendar/calendar-card";
import { PageHeader } from "@/components/shared/page-header";
import { data } from "@/lib/data";

export default function CalendarPage() {
  return (
    <section className="space-y-4">
      <PageHeader title="Calendar" description="Programs, classes, camps, and events." />
      <div className="grid gap-3 md:grid-cols-2">
        {data.classCampSessions.map((session) => {
          const program = data.programs.find((entry) => entry.id === session.programId);
          if (!program) return null;
          return <CalendarCard key={session.id} program={program} session={session} />;
        })}
      </div>
    </section>
  );
}
