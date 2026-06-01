import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";

export default function CustomerPortalLoading() {
  return (
    <CustomerPortalContainer>
      <section className="space-y-4" data-testid="customer-portal-loading-skeleton">
        <div className="h-8 w-72 animate-pulse rounded-md bg-slate-200" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl border bg-slate-100" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl border bg-slate-100" />
      </section>
    </CustomerPortalContainer>
  );
}
