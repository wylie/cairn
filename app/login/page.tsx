import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Staff Login</CardTitle>
          <CardDescription>Placeholder screen for authenticated staff access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            TODO(auth): Replace with Supabase Auth + role-based routing for front desk, manager, and admin.
          </p>
          <Link href="/dashboard">
            <Button className="w-full">Continue to MVP</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
