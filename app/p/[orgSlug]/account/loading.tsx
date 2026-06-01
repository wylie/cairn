import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";

export default function CustomerAccountLoading() {
  return (
    <CustomerPortalContainer>
      <section className="space-y-4" data-testid="customer-account-loading-skeleton">
        <div className="h-8 w-64 animate-pulse rounded-md bg-slate-200" />
        <div className="h-[520px] animate-pulse rounded-xl border bg-slate-100" />
      </section>
    </CustomerPortalContainer>
  );
}
