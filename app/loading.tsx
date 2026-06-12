import { PageLoadingSkeleton } from "@/components/shared/page-loading-skeleton";

export default function MarketingLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14 md:px-10">
      <PageLoadingSkeleton variant="marketing" testId="marketing-loading-skeleton" />
    </main>
  );
}
