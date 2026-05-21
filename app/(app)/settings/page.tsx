import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Org, permissions, and integrations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">TODO(auth): configure staff roles and invitation flow.</p>
        <p className="text-sm text-muted-foreground">TODO(supabase): attach organization-level preferences table.</p>
      </CardContent>
    </Card>
  );
}
