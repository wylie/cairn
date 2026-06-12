import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";
import { PageLoadingSkeleton } from "@/components/shared/page-loading-skeleton";

export default function CustomerAccountLoading() {
  return (
    <CustomerPortalContainer>
      <PageLoadingSkeleton variant="customer" testId="customer-account-loading-skeleton" />
    </CustomerPortalContainer>
  );
}
