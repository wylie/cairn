import { PageLoadingSkeleton } from "@/components/shared/page-loading-skeleton";

export default function StaffAppLoading() {
  return <PageLoadingSkeleton variant="staff" testId="staff-loading-skeleton" />;
}
