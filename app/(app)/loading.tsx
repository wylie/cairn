export default function StaffAppLoading() {
  return (
    <section className="space-y-4" data-testid="staff-loading-skeleton">
      <div className="h-8 w-64 animate-pulse rounded-md bg-slate-200" />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl border bg-slate-100" />
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-xl border bg-slate-100" />
    </section>
  );
}
