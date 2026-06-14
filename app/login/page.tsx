import Link from "next/link";

export default function GlobalLoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl items-center p-4">
      <section className="w-full rounded-xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">Staff access is facility-specific</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open Staff Login from your facility&apos;s Cairn page or use the facility-specific link provided by your administrator.
        </p>
        <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          Cairn does not publish a directory of customer organizations. This keeps each facility&apos;s staff access private and clearly scoped.
        </div>
        <div className="mt-4 rounded-lg border border-dashed p-3 text-sm">
          <p className="font-medium">Platform administration</p>
          <p className="mt-1 text-muted-foreground">Use the control plane to provision organizations, templates, and demo facilities.</p>
          <Link href="/admin/login" className="mt-3 inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium hover:bg-secondary">
            Platform Admin Login
          </Link>
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
