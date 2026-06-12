import { PageLoadingSkeleton } from "@/components/shared/page-loading-skeleton";

export default function PlatformAdminLoading() {
  return <PageLoadingSkeleton variant="admin" testId="platform-admin-loading-skeleton" />;
}
