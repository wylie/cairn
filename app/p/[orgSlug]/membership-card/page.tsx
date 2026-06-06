"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";
import { DigitalMembershipCard } from "@/components/memberships/digital-membership-card";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { useSettingsState } from "@/lib/state/settings-state";
import { buildMembershipCardRecord, selectPrimaryMembershipCardRecord } from "@/lib/memberships/cards";

export default function CustomerPortalMembershipCardPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params?.orgSlug ?? "summit";
  const searchParams = useSearchParams();
  const requestedCustomerId = searchParams?.get("customerId") ?? "";
  const { settings } = useSettingsState();
  const { visibleCustomers, visibleCustomerIds, customerAccessRecords, accessProducts, householdMembers, recordMembershipCardEvent } =
    useCustomerPortalData();
  const [expanded, setExpanded] = useState(false);

  const cardCandidates = useMemo(
    () =>
      visibleCustomers
        .map((customer) => {
          const accessRecord = selectPrimaryMembershipCardRecord(
            customerAccessRecords.filter((entry) => entry.customerId === customer.id)
          );
          if (!accessRecord) return null;
          const product = accessProducts.find((entry) => entry.id === accessRecord.productId);
          const householdRole = householdMembers.find((entry) => entry.customerId === customer.id);
          return {
            customer,
            accessRecord,
            product,
            householdRole,
            card: buildMembershipCardRecord(customer, accessRecord, orgSlug)
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [visibleCustomers, customerAccessRecords, accessProducts, householdMembers, orgSlug]
  );

  const selectedCandidate =
    cardCandidates.find((entry) => entry.customer.id === requestedCustomerId && visibleCustomerIds.includes(entry.customer.id)) ??
    cardCandidates[0];

  useEffect(() => {
    if (!selectedCandidate) return;
    recordMembershipCardEvent({
      customerId: selectedCandidate.customer.id,
      accessRecordId: selectedCandidate.accessRecord.id,
      action: "viewed",
      source: "customer_portal"
    });
  }, [recordMembershipCardEvent, selectedCandidate]);

  return (
    <CustomerPortalContainer>
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold">Membership Card</h2>
          <p className="text-sm text-muted-foreground">
            Active membership cards are household-scoped. Guardians can view dependent cards they manage.
          </p>
        </header>

        {cardCandidates.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>Choose a Card</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {cardCandidates.map((entry) => (
                <Link
                  key={entry.customer.id}
                  href={`/p/${orgSlug}/membership-card?customerId=${entry.customer.id}`}
                  className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm ${
                    selectedCandidate?.customer.id === entry.customer.id ? "border-primary bg-primary/5" : "hover:bg-secondary"
                  }`}
                >
                  {entry.customer.firstName} {entry.customer.lastName}
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {!selectedCandidate ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No active or recent membership cards are available for this account.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {selectedCandidate.householdRole ? (
                  <Badge tone="muted">
                    {selectedCandidate.householdRole.role === "child" || selectedCandidate.householdRole.role === "dependent"
                      ? "Dependent card"
                      : "Member card"}
                  </Badge>
                ) : null}
                <span>{selectedCandidate.product?.name ?? "Membership"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="h-9" onClick={() => setExpanded((prev) => !prev)}>
                  {expanded ? "Collapse Card" : "Expand Card"}
                </Button>
                <Button variant="secondary" className="h-9">
                  Download Placeholder
                </Button>
              </div>
            </div>

            <DigitalMembershipCard
              className={expanded ? "max-w-3xl" : undefined}
              customer={selectedCandidate.customer}
              accessRecord={selectedCandidate.accessRecord}
              membershipName={selectedCandidate.product?.name ?? "Membership"}
              organizationName={settings.facilityProfile.facilityName}
              organizationLogoUrl={settings.branding.logoUrl || undefined}
              primaryColor={settings.branding.primaryColor}
              secondaryColor={settings.branding.secondaryColor}
              membershipNumber={selectedCandidate.card.membershipNumber}
              qrToken={selectedCandidate.card.qrToken}
              barcodeValue={selectedCandidate.card.barcodeValue}
            />

            <Card>
              <CardHeader>
                <CardTitle>Card Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link
                  href={`/p/${orgSlug}/memberships`}
                  className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm"
                >
                  View Memberships
                </Link>
                <Link
                  href={`/p/${orgSlug}/memberships/${selectedCandidate.accessRecord.id}?customerId=${selectedCandidate.customer.id}`}
                  className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm"
                >
                  View Membership Details
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </CustomerPortalContainer>
  );
}
