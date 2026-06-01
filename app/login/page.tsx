import Link from "next/link";
import { data } from "@/lib/data";

export default function GlobalLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center p-4">
      <section className="w-full rounded-xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">Choose a facility for staff login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff login is organization-specific. Select your facility to continue.
        </p>
        <div className="mt-5 space-y-3">
          {(data.organizations ?? []).map((organization) => (
            <div key={organization.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{organization.name}</p>
                <p className="text-xs text-muted-foreground">/{organization.slug}</p>
              </div>
              <Link
                href={`/o/${organization.slug}/login`}
                className="inline-flex min-h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                Staff Login
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <Link href="/" className="text-sm text-primary underline underline-offset-4">
            Back to Cairn homepage
          </Link>
        </div>
      </section>
    </div>
  );
}
