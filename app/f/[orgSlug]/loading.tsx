export default function FacilityLandingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <main className="mx-auto max-w-6xl space-y-8 p-6 md:p-10" data-testid="facility-loading-skeleton">
        <div className="h-56 animate-pulse rounded-2xl border bg-slate-100" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl border bg-slate-100" />
          <div className="h-64 animate-pulse rounded-xl border bg-slate-100" />
        </div>
      </main>
    </div>
  );
}
