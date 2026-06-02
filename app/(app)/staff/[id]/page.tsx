"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildCustomerDetailHref } from "@/lib/navigation/detail-navigation";

export default function StaffDetailRedirectPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = params.id;
  const currentSearch = searchParams?.toString?.() ?? "";
  const destinationHref = customerId
    ? `${buildCustomerDetailHref({
        customerId,
        currentPathname: pathname,
        currentSearch
      })}#staff-profile`
    : "/customers";

  useEffect(() => {
    if (!customerId) return;
    router.replace(destinationHref);
  }, [customerId, destinationHref, router]);

  return (
    <section className="space-y-2">
      <p className="text-sm text-muted-foreground">Redirecting to customer profile…</p>
      <Link href={destinationHref} className="text-sm text-primary underline">
        Open customer profile
      </Link>
    </section>
  );
}
