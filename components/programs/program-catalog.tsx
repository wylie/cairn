"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClassCampSession, Program } from "@/types/domain";

export function ProgramCatalog({ programs, sessions }: { programs: Program[]; sessions: ClassCampSession[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Catalog</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {programs.map((program) => {
          const count = sessions.filter((entry) => entry.programId === program.id).length;
          return (
            <article key={program.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{program.title}</p>
                <Badge variant="secondary">{program.category}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{count} session(s)</p>
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}

