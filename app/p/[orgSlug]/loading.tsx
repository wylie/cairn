import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";
import { PageLoadingSkeleton } from "@/components/shared/page-loading-skeleton";

export default function CustomerPortalLoading() {
  return (
    <CustomerPortalContainer>
      <PageLoadingSkeleton variant="customer" testId="customer-portal-loading-skeleton" />
    </CustomerPortalContainer>
  );
}
