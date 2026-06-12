import { cn } from "@/lib/utils";

type PageLoadingSkeletonProps = {
  variant?: "staff" | "customer" | "facility" | "admin" | "marketing";
  className?: string;
  testId?: string;
};

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-xl border bg-slate-100", className)} />;
}

function SkeletonLine({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}

export function PageLoadingSkeleton({ variant = "staff", className, testId }: PageLoadingSkeletonProps) {
  const isStaff = variant === "staff";
  const isAdmin = variant === "admin";
  const isCustomer = variant === "customer";
  const isFacility = variant === "facility";

  return (
    <section className={cn("space-y-5", className)} data-testid={testId ?? `${variant}-loading-skeleton`}>
      <div className="space-y-2">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-8 w-72 max-w-full" />
        <SkeletonLine className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: isFacility ? 4 : 8 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-24" />
        ))}
      </div>

      {isStaff || isAdmin ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <SkeletonLine className="h-5 w-40" />
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[56px_1fr_120px]">
                <SkeletonBlock className="h-14 w-14 rounded-full border-0" />
                <div className="space-y-2">
                  <SkeletonLine className="h-4 w-48" />
                  <SkeletonLine className="h-3 w-full max-w-md" />
                </div>
                <SkeletonLine className="h-8 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <SkeletonBlock className="h-72" />
            <SkeletonBlock className="h-48" />
          </div>
        </div>
      ) : null}

      {isCustomer ? (
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <SkeletonBlock className="h-80" />
          <div className="space-y-3">
            <SkeletonBlock className="h-36" />
            <SkeletonBlock className="h-36" />
            <SkeletonBlock className="h-36" />
          </div>
        </div>
      ) : null}

      {isFacility || variant === "marketing" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-64" />
        </div>
      ) : null}
    </section>
  );
}
