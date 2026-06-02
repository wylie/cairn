"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { resolveContextBackLink } from "@/lib/navigation/detail-navigation";

export function ContextBackLink({
  fallbackHref = "/customers",
  fallbackLabel = "Customers",
  className = "text-sm text-primary underline"
}: {
  fallbackHref?: string;
  fallbackLabel?: string;
  className?: string;
}) {
  const searchParams = useSearchParams();

  const backLink = useMemo(
    () => resolveContextBackLink(new URLSearchParams(searchParams?.toString() ?? ""), fallbackHref, fallbackLabel),
    [fallbackHref, fallbackLabel, searchParams]
  );

  return (
    <Link href={backLink.href} className={className}>
      {backLink.label}
    </Link>
  );
}
