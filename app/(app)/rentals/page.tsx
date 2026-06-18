"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionGate } from "@/components/staff/permission-gate";
import { Button } from "@/components/ui/button";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { formatCurrency } from "@/lib/transactions";
import { formatDateTime, formatTime } from "@/lib/format/date";
import { data } from "@/lib/data";

function buildIsoDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function getStatusTone(status: string) {
  if (status === "confirmed" || status === "checked_in") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "cancelled") return "bg-rose-50 text-rose-700 border-rose-200";
  if (status === "checked_out" || status === "completed") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function RentalsPage() {
  const {
    customers,
    households,
    householdMembers,
    rentableResources,
    reservations,
    maintenanceBlocks,
    createReservation,
    checkInReservation,
    checkOutReservation,
    cancelReservation,
    createMaintenanceBlock
  } = useCustomerState();
  const { activeStaff } = useWorkstationState();

  const [selectedResourceId, setSelectedResourceId] = useState(rentableResources[0]?.id ?? "");
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id ?? "");
  const [selectedReservationId, setSelectedReservationId] = useState(reservations[0]?.id ?? "");
  const [reservationDate, setReservationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("15:00");
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");

  const resourceById = useMemo(() => new Map(rentableResources.map((entry) => [entry.id, entry])), [rentableResources]);
  const householdByCustomerId = useMemo(
    () => new Map(householdMembers.map((entry) => [entry.customerId, households.find((household) => household.id === entry.householdId)])),
    [householdMembers, households]
  );

  const todaysReservations = reservations.filter((entry) => entry.startsAt.slice(0, 10) === reservationDate);
  const upcomingReservations = [...reservations]
    .filter((entry) => ["confirmed", "checked_in"].includes(entry.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const checkInsDue = reservations.filter((entry) => entry.status === "confirmed" && entry.startsAt.slice(0, 10) === reservationDate).length;
  const overdueReturns = reservations.filter((entry) => entry.reservationType === "equipment_checkout" && entry.status === "checked_in").length;
  const activeResources = rentableResources.filter((entry) => entry.status === "active").length;
  const capacityUtilization = rentableResources.length === 0 ? 0 : Math.round((upcomingReservations.length / rentableResources.length) * 100);

  const selectedReservation = reservations.find((entry) => entry.id === selectedReservationId) ?? reservations[0];

  return (
    <PermissionGate permission="manageRentals">
      <section className="space-y-4" data-testid="rentals-page">
        <PageHeader
          title="Rentals"
          description="Reserve spaces, manage equipment checkouts, block maintenance windows, and track reservation operations."
        />

        {feedback ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}
        {warning ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard title="Today's Reservations" value={todaysReservations.length} hint="Confirmed and active for selected day" />
          <MetricCard title="Upcoming Reservations" value={upcomingReservations.length} hint="Across all resources" />
          <MetricCard title="Check-Ins Due" value={checkInsDue} hint="Confirmed reservations today" />
          <MetricCard title="Overdue Equipment Returns" value={overdueReturns} hint="Checked out and not returned" />
          <MetricCard title="Capacity Utilization" value={`${capacityUtilization}%`} hint={`${activeResources} active resources`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_380px]">
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <div>
              <h2 className="text-lg font-semibold">Resources</h2>
              <p className="text-sm text-muted-foreground">Spaces, equipment, and experiences available for booking.</p>
            </div>
            <div className="space-y-2">
              {rentableResources.map((resource) => {
                const location = data.locations.find((entry) => entry.id === resource.locationId);
                return (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={() => setSelectedResourceId(resource.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${selectedResourceId === resource.id ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{resource.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${getStatusTone(resource.status)}`}>{resource.status.replaceAll("_", " ")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{resource.category} · {location?.name ?? resource.locationId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {resource.pricingRules[0] ? `${resource.pricingRules[0].label}: ${formatCurrency(resource.pricingRules[0].priceCents / 100)}` : "No pricing rule"}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Reservation Dashboard</h2>
                <p className="text-sm text-muted-foreground">Create bookings, confirm conflicts, and manage maintenance blocks.</p>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <h3 className="text-base font-semibold">Create Reservation</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Resource</span>
                  <select className="h-11 w-full rounded-md border bg-background px-3" value={selectedResourceId} onChange={(event) => setSelectedResourceId(event.target.value)}>
                    {rentableResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Customer / Household</span>
                  <select className="h-11 w-full rounded-md border bg-background px-3" value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                    {customers.map((customer) => {
                      const household = householdByCustomerId.get(customer.id);
                      return <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}{household ? ` · ${household.householdName}` : ""}</option>;
                    })}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <input className="h-11 w-full rounded-md border bg-background px-3" type="date" value={reservationDate} onChange={(event) => setReservationDate(event.target.value)} />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">Start</span>
                    <input className="h-11 w-full rounded-md border bg-background px-3" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground">End</span>
                    <input className="h-11 w-full rounded-md border bg-background px-3" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                  </label>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const customer = customers.find((entry) => entry.id === selectedCustomerId);
                    const resource = rentableResources.find((entry) => entry.id === selectedResourceId);
                    if (!customer || !resource) {
                      setWarning("Select a resource and customer.");
                      setFeedback("");
                      return;
                    }
                    const household = householdByCustomerId.get(customer.id);
                    const result = createReservation({
                      locationId: resource.locationId,
                      resourceId: resource.id,
                      reservationType: resource.type === "equipment" ? "equipment_checkout" : "single",
                      status: "confirmed",
                      title: `${resource.name} reservation`,
                      customerId: customer.id,
                      householdId: household?.id,
                      participants: [{
                        customerId: customer.id,
                        householdId: household?.id,
                        displayName: `${customer.firstName} ${customer.lastName}`
                      }],
                      startsAt: buildIsoDateTime(reservationDate, startTime),
                      endsAt: buildIsoDateTime(reservationDate, endTime),
                      totalPriceCents: resource.pricingRules[0]?.priceCents ?? 0,
                      waiverTemplateIds: resource.waiverTemplateIds,
                      requiresWaiver: Boolean(resource.waiverTemplateIds?.length),
                      createdByStaffId: activeStaff?.id,
                      createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff"
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
                  Create Reservation
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const resource = rentableResources.find((entry) => entry.id === selectedResourceId);
                    if (!resource) return;
                    const result = createMaintenanceBlock({
                      locationId: resource.locationId,
                      resourceId: resource.id,
                      title: `${resource.name} maintenance`,
                      description: "Temporary maintenance block",
                      startsAt: buildIsoDateTime(reservationDate, startTime),
                      endsAt: buildIsoDateTime(reservationDate, endTime),
                      createdByStaffId: activeStaff?.id,
                      createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff"
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
                  Add Maintenance Block
                </Button>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <h3 className="text-base font-semibold">Reservations</h3>
              <div className="mt-3 space-y-2">
                {upcomingReservations.map((reservation) => {
                  const resource = resourceById.get(reservation.resourceId);
                  const holder = reservation.participants[0]?.displayName ?? reservation.title;
                  return (
                    <button
                      key={reservation.id}
                      type="button"
                      onClick={() => setSelectedReservationId(reservation.id)}
                      className={`w-full rounded-lg border p-3 text-left transition ${selectedReservationId === reservation.id ? "border-primary bg-primary/5" : "hover:bg-secondary"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{resource?.name ?? reservation.title}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${getStatusTone(reservation.status)}`}>{reservation.status.replaceAll("_", " ")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{holder}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(reservation.startsAt)} - {formatTime(reservation.endsAt)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-lg font-semibold">Reservation Detail</h2>
              {selectedReservation ? (
                <div className="mt-3 space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resource</p>
                    <p className="font-medium">{resourceById.get(selectedReservation.resourceId)?.name ?? selectedReservation.resourceId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reservation holder</p>
                    <p>{selectedReservation.participants.map((entry) => entry.displayName).join(", ")}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time</p>
                      <p>{formatDateTime(selectedReservation.startsAt)} - {formatTime(selectedReservation.endsAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Price</p>
                      <p>{formatCurrency(selectedReservation.totalPriceCents / 100)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const result = checkInReservation(selectedReservation.id, activeStaff?.id ?? "staff_001", activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff");
                        setFeedback(result.message);
                        setWarning(result.ok ? "" : result.message);
                      }}
                    >
                      Check In
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const result = checkOutReservation(selectedReservation.id, activeStaff?.id ?? "staff_001", activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff");
                        setFeedback(result.message);
                        setWarning(result.ok ? "" : result.message);
                      }}
                    >
                      Check Out
                    </Button>
                    <Button
                      variant="destructiveSubtle"
                      onClick={() => {
                        const result = cancelReservation(selectedReservation.id, activeStaff?.id, activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff");
                        setFeedback(result.message);
                        setWarning(result.ok ? "" : result.message);
                      }}
                    >
                      Cancel Reservation
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Select a reservation to view details.</p>
              )}
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h2 className="text-lg font-semibold">Maintenance Blocks</h2>
              <div className="mt-3 space-y-2 text-sm">
                {maintenanceBlocks.length === 0 ? <p className="text-muted-foreground">No maintenance blocks scheduled.</p> : null}
                {maintenanceBlocks.map((block) => (
                  <div key={block.id} className="rounded-lg border p-3">
                    <p className="font-medium">{block.title}</p>
                    <p className="text-xs text-muted-foreground">{resourceById.get(block.resourceId)?.name ?? block.resourceId}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(block.startsAt)} - {formatDateTime(block.endsAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </PermissionGate>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
