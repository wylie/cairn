import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth/session";
import { data } from "@/lib/data";

export default async function OrganizationChooserPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  const organizations = data.organizations;
  const allowed = organizations.filter((entry) => session.organizationSlugs.includes(entry.slug));
  if (allowed.length === 1) redirect(`/o/${allowed[0].slug}/dashboard`);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Choose Organization</CardTitle>
          <CardDescription>Select the organization you want to manage.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {allowed.map((org) => (
            <Link key={org.id} href={`/o/${org.slug}/dashboard`}>
              <Button className="w-full justify-start" variant="outline">{org.name}</Button>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
