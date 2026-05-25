"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function StaffDetailRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params.id;

  useEffect(() => {
    if (!customerId) return;
    router.replace(`/customers/${customerId}#staff-profile`);
  }, [customerId, router]);

  return (
    <section className="space-y-2">
      <p className="text-sm text-muted-foreground">Redirecting to customer profile…</p>
      <Link href={customerId ? `/customers/${customerId}#staff-profile` : "/customers"} className="text-sm text-primary underline">
        Open customer profile
      </Link>
    </section>
  );
}
