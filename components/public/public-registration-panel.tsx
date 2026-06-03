"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePublicCart } from "@/lib/public-cart";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { formatDateTime } from "@/lib/format/date";
import type { Program, ClassCampSession } from "@/types/domain";
import { getLocationName, getSessionStats, getProgramPricing } from "@/lib/public-programs";

export function PublicRegistrationPanel({
  orgSlug,
  program,
  session
}: {
  orgSlug: string;
  program: Program;
  session: ClassCampSession;
}) {
  const router = useRouter();
  const { addSessionItem } = usePublicCart();
  const { primaryCustomerId, registrations } = useCustomerPortalData();
  const stats = getSessionStats(session);
  const pricing = getProgramPricing(program);
  const duplicate = primaryCustomerId
    ? registrations.find((entry) => entry.customerId === primaryCustomerId && entry.sessionId === session.id && entry.status !== "cancelled")
    : null;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4" data-testid="public-registration-panel">
      <div>
        <h2 className="text-lg font-semibold">Register Online</h2>
        <p className="text-sm text-muted-foreground">Select a participant, review eligibility, validate waivers, and complete payment in one checkout flow.</p>
      </div>

      <div className="rounded-lg border p-3 text-sm">
        <p className="font-medium">{program.title}</p>
        <p className="text-muted-foreground">{formatDateTime(session.startsAt)} · {getLocationName(session.locationId)}</p>
        <p className="mt-2">{stats.registered}/{session.capacity} registered{stats.waitlisted > 0 ? ` · ${stats.waitlisted} waitlisted` : ""}</p>
        <p>Member price: {pricing.memberCents !== null ? formatCents(pricing.memberCents) : "TBD"}</p>
        <p>Non-member price: {pricing.nonMemberCents !== null ? formatCents(pricing.nonMemberCents) : "TBD"}</p>
      </div>

      {duplicate ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You are already {duplicate.status} for this session.
        </p>
      ) : null}

      <div className="space-y-2">
        <Button
          className="min-h-11 w-full"
          disabled={Boolean(duplicate)}
          onClick={() => {
            addSessionItem({ sessionId: session.id, programId: program.id, participantCustomerId: primaryCustomerId });
            router.push(`/p/${orgSlug}/checkout`);
          }}
        >
          {stats.full ? "Join Waitlist" : "Continue to Checkout"}
        </Button>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/p/${orgSlug}/waivers/${program.requiredWaiverTemplateIds?.[0] ?? "wtpl_general"}`} className="inline-flex min-h-10 items-center rounded-md border border-input px-3 hover:bg-secondary">Sign Waiver</Link>
          <Link href={`/p/${orgSlug}/login?next=/p/${orgSlug}/checkout`} className="inline-flex min-h-10 items-center rounded-md border border-input px-3 hover:bg-secondary">Customer Login</Link>
        </div>
      </div>
    </div>
  );
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
