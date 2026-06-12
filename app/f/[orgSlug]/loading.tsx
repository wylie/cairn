import { PageLoadingSkeleton } from "@/components/shared/page-loading-skeleton";

export default function FacilityLandingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white text-slate-900">
      <main className="mx-auto max-w-6xl p-6 md:p-10">
        <PageLoadingSkeleton variant="facility" testId="facility-loading-skeleton" />
      </main>
    </div>
  );
}
