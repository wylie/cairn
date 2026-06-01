import type { ReactNode } from "react";

export function CustomerPortalContainer({ children }: { children: ReactNode }) {
  return (
    <div data-testid="customer-portal-container" className="mx-auto w-full max-w-6xl px-4 py-4 md:px-6">
      {children}
    </div>
  );
}

