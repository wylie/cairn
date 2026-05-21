import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export default function ProgramsPage() {
  return (
    <section className="space-y-4">
      <PageHeader title="Programs" description="Classes, camps, clinics, and courses." />
      <Card>
        <CardHeader>
          <CardTitle>Program Catalog</CardTitle>
          <CardDescription>Placeholder for templates, rosters, attendance, and waitlists.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">TODO(supabase): move program/session data to Postgres tables.</p>
        </CardContent>
      </Card>
    </section>
  );
}
