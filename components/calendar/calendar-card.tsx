import type { ClassCampSession, Program } from "@/types/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/format/date";

export function CalendarCard({ program, session }: { program: Program; session: ClassCampSession }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{program.title}</CardTitle>
        <CardDescription>{program.category.toUpperCase()}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {formatDate(session.startsAt)} at {formatTime(session.startsAt)}
        </p>
        <p className="mt-1 text-sm">{session.enrolled}/{session.capacity} enrolled</p>
      </CardContent>
    </Card>
  );
}
