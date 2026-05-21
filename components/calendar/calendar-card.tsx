import type { ClassCampSession, Program } from "@/types/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CalendarCard({ program, session }: { program: Program; session: ClassCampSession }) {
  const start = new Date(session.startsAt);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{program.title}</CardTitle>
        <CardDescription>{program.category.toUpperCase()}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {start.toLocaleDateString()} at {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-1 text-sm">{session.enrolled}/{session.capacity} enrolled</p>
      </CardContent>
    </Card>
  );
}
