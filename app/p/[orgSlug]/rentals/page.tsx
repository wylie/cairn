"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerPortalContainer } from "@/components/portal/customer-portal-container";
import { useCustomerPortalData } from "@/lib/portal/use-customer-portal-data";
import { formatDateTime, formatTime } from "@/lib/format/date";
import { formatCurrency } from "@/lib/transactions";
import { data } from "@/lib/data";

function buildIsoDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function CustomerPortalRentalsPage() {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = params?.orgSlug ?? "summit";
  const {
    activeLocationId,
    visibleCustomers,
    visibleCustomerIds,
    rentableResources,
    reservations,
    createReservation,
    cancelReservation
  } = useCustomerPortalData();

  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(visibleCustomerIds[0] ?? "");
  const [date, setDate] = useState("2026-05-22");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");

  const availableResources = rentableResources.filter(
    (entry) => entry.locationId === activeLocationId && ["active", "seasonal"].includes(entry.status)
  );
  const selectedResource = availableResources.find((entry) => entry.id === selectedResourceId) ?? availableResources[0];
  const visibleReservations = reservations
    .filter(
      (entry) =>
        visibleCustomerIds.includes(entry.customerId ?? "") ||
        entry.participants.some((participant) => visibleCustomerIds.includes(participant.customerId))
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const upcomingReservations = visibleReservations.filter((entry) => ["draft", "confirmed", "checked_in"].includes(entry.status));
  const reservationHistory = visibleReservations.filter((entry) => ["checked_out", "completed", "cancelled"].includes(entry.status));
  const locationsById = useMemo(() => new Map(data.locations.map((entry) => [entry.id, entry.name])), []);

  return (
    <CustomerPortalContainer>
      <section className="space-y-4" data-testid="customer-rentals-page">
        <div className="rounded-xl border bg-card p-4">
          <h1 className="text-2xl font-semibold">Rentals & Reservations</h1>
          <p className="text-sm text-muted-foreground">Browse resources at your selected location, reserve them for yourself or your household, and track upcoming reservations.</p>
        </div>

        {feedback ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}
        {warning ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p> : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Browse Resources</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {availableResources.map((resource) => (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={() => setSelectedResourceId(resource.id)}
                    className={`rounded-xl border p-4 text-left transition ${selectedResource?.id === resource.id ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{resource.name}</p>
                      <span className="text-xs text-muted-foreground">{resource.type.replaceAll("_", " ")}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{resource.description}</p>
                    <p className="mt-2 text-sm">{formatCurrency((resource.pricingRules[0]?.priceCents ?? 0) / 100)}</p>
                    <p className="text-xs text-muted-foreground">{locationsById.get(resource.locationId) ?? resource.locationId}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Reservations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {upcomingReservations.length === 0 ? <p className="text-muted-foreground">No upcoming reservations.</p> : null}
                {upcomingReservations.map((reservation) => {
                  const resource = rentableResources.find((entry) => entry.id === reservation.resourceId);
                  return (
                    <div key={reservation.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{resource?.name ?? reservation.title}</p>
                          <p className="text-xs text-muted-foreground">{reservation.participants.map((entry) => entry.displayName).join(", ")}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(reservation.startsAt)} - {formatTime(reservation.endsAt)}</p>
                        </div>
                        <Button
                          variant="destructiveSubtle"
                          onClick={() => {
                            const result = cancelReservation(reservation.id);
                            setFeedback(result.message);
                            setWarning(result.ok ? "" : result.message);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reservation History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {reservationHistory.length === 0 ? <p className="text-muted-foreground">No reservation history yet.</p> : null}
                {reservationHistory.map((reservation) => {
                  const resource = rentableResources.find((entry) => entry.id === reservation.resourceId);
                  return (
                    <div key={reservation.id} className="rounded-lg border p-3">
                      <p className="font-medium">{resource?.name ?? reservation.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(reservation.startsAt)}</p>
                      <p className="text-xs text-muted-foreground">Status: {reservation.status.replaceAll("_", " ")}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Make Reservation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <label className="space-y-1">
                <span className="text-muted-foreground">Resource</span>
                <select className="h-11 w-full rounded-md border bg-background px-3" value={selectedResource?.id ?? ""} onChange={(event) => setSelectedResourceId(event.target.value)}>
                  {availableResources.map((resource) => (
                    <option key={resource.id} value={resource.id}>{resource.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-muted-foreground">Participant</span>
                <select className="h-11 w-full rounded-md border bg-background px-3" value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                  {visibleCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-muted-foreground">Date</span>
                <input className="h-11 w-full rounded-md border bg-background px-3" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-muted-foreground">Start</span>
                  <input className="h-11 w-full rounded-md border bg-background px-3" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                </label>
                <label className="space-y-1">
                  <span className="text-muted-foreground">End</span>
                  <input className="h-11 w-full rounded-md border bg-background px-3" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                </label>
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 text-xs text-muted-foreground">
                {selectedResource?.waiverTemplateIds?.length ? "Waiver required before check-in." : "No waiver required."}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const customer = visibleCustomers.find((entry) => entry.id === selectedCustomerId);
                  if (!selectedResource || !customer) {
                    setWarning("Select a resource and participant.");
                    setFeedback("");
                    return;
                  }
                  const result = createReservation({
                    locationId: selectedResource.locationId,
                    resourceId: selectedResource.id,
                    reservationType: selectedResource.type === "equipment" ? "equipment_checkout" : "single",
                    status: "confirmed",
                    title: `${selectedResource.name} reservation`,
                    customerId: customer.id,
                    participants: [{ customerId: customer.id, displayName: `${customer.firstName} ${customer.lastName}` }],
                    startsAt: buildIsoDateTime(date, startTime),
                    endsAt: buildIsoDateTime(date, endTime),
                    totalPriceCents: selectedResource.pricingRules[0]?.priceCents ?? 0,
                    waiverTemplateIds: selectedResource.waiverTemplateIds,
                    requiresWaiver: Boolean(selectedResource.waiverTemplateIds?.length)
                  });
                  if (!result.ok) {
                    setWarning(result.message);
                    setFeedback("");
                    return;
                  }
                  setWarning("");
                  setFeedback(result.message);
                }}
              >
                Reserve Resource
              </Button>
              <div className="pt-2 text-xs text-muted-foreground">
                Need passes or memberships too? <Link className="text-primary underline" href={`/p/${orgSlug}/store`}>Open Store</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </CustomerPortalContainer>
  );
}
