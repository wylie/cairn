"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AddCustomerModal } from "@/components/customers/add-customer-modal";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { CheckInRow } from "@/components/checkins/checkin-row";
import { SellAccessModal } from "@/components/pos/sell-access-modal";
import { StaffSwitcher } from "@/components/staff/staff-switcher";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { CustomerAvatar } from "@/components/customers/customer-avatar";
import { InfoField } from "@/components/shared/info-field";
import { buildCustomerDetailHref } from "@/lib/navigation/detail-navigation";
import { formatDateWithAge, formatShortDate, formatTime } from "@/lib/format/date";

export function CheckInList() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString?.() ?? "";
  const {
    activeDateKey,
    isActiveDateToday,
    goToNextDay,
    goToPreviousDay,
    setToday,
    todayLogRecords,
    occupancyCount,
    totalCheckIns,
    checkedOutCount,
    searchCustomers,
    customers,
    accessProducts,
    checkInCustomer,
    checkOutRecord,
    evaluateCustomerEntry,
    sellAccessProducts,
    addCustomer,
    householdMembers,
    familyCheckIn,
    checkInRecords,
    registrations,
    sessions,
    programs
  } = useCustomerState();
  const { activeStaff, assertPermission, requestStaffSwitch, hasPermission, logAuditEvent } = useWorkstationState();

  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [quickFilter, setQuickFilter] = useState<"all" | "eligible" | "blocked" | "checked_in">("all");
  const [feedback, setFeedback] = useState<string>("");
  const [warning, setWarning] = useState<string>("");
  const [showSwitchPrompt, setShowSwitchPrompt] = useState(false);
  const [sellCustomerId, setSellCustomerId] = useState<string | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [familySelection, setFamilySelection] = useState<string[]>([]);
  const [undoState, setUndoState] = useState<{ recordId: string; expiresAt: number; customerName: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState<"staff_discretion" | "waiver_exception" | "trial_access" | "technical_issue" | "other">("staff_discretion");
  const [overrideOtherReason, setOverrideOtherReason] = useState("");
  const [checkedInFilter, setCheckedInFilter] = useState<"all" | "facility" | "program" | "kids" | "waiver_issues">("all");
  const [checkedInQuery, setCheckedInQuery] = useState("");
  const maxSearchResults = 50;
  const searchInputRef = useRef<HTMLInputElement>(null!);
  const sellCustomer = useMemo(() => customers.find((entry) => entry.id === sellCustomerId) ?? null, [customers, sellCustomerId]);

  const queryResults = useMemo(() => searchCustomers(query), [searchCustomers, query]);
  const filteredResults = useMemo(() => {
    if (quickFilter === "all") return queryResults;
    if (quickFilter === "checked_in") return queryResults.filter((entry) => entry.checkInStatus === "in");
    if (quickFilter === "eligible") return queryResults.filter((entry) => evaluateCustomerEntry(entry.id).allowed);
    return queryResults.filter((entry) => !evaluateCustomerEntry(entry.id).allowed);
  }, [queryResults, quickFilter, evaluateCustomerEntry]);
  const visibleResults = useMemo(() => filteredResults.slice(0, maxSearchResults), [filteredResults]);
  const highlighted = visibleResults[Math.min(highlightIndex, Math.max(visibleResults.length - 1, 0))];
  const selectedCustomer = customers.find((entry) => entry.id === selectedCustomerId);
  const selectedDecision = selectedCustomer ? evaluateCustomerEntry(selectedCustomer.id) : null;
  const activeRecord = selectedCustomer
    ? todayLogRecords.find((record) => record.customerId === selectedCustomer.id && record.status === "checked-in")
    : null;
  const selectedHouseholdMembership = selectedCustomer
    ? householdMembers.find((entry) => entry.customerId === selectedCustomer.id)
    : undefined;
  const canActForHousehold = Boolean(selectedHouseholdMembership?.canCheckInOthers);
  const householdDependents = selectedHouseholdMembership
    ? householdMembers
        .filter(
          (entry) =>
            entry.householdId === selectedHouseholdMembership.householdId &&
            entry.customerId !== selectedCustomer?.id &&
            (entry.role === "child" || entry.role === "dependent")
        )
        .map((entry) => ({
          ...entry,
          customer: customers.find((customer) => customer.id === entry.customerId)
        }))
        .filter((entry) => entry.customer)
    : [];
  const occupancyBreakdown = useMemo(() => {
    const activeIds = new Set(
      todayLogRecords.filter((record) => record.status === "checked-in").map((record) => record.customerId)
    );
    let youth = 0;
    let adults = 0;
    activeIds.forEach((customerId) => {
      const member = householdMembers.find((entry) => entry.customerId === customerId);
      if (member?.memberType === "child" || member?.role === "child" || member?.role === "dependent") youth += 1;
      else adults += 1;
    });
    return { adults, youth };
  }, [todayLogRecords, householdMembers]);
  const activeGuardianName = selectedHouseholdMembership
    ? householdMembers
        .filter((entry) => entry.householdId === selectedHouseholdMembership.householdId && entry.canCheckInOthers && entry.customerId !== selectedCustomer?.id)
        .map((entry) => {
          const guardian = customers.find((customer) => customer.id === entry.customerId);
          const checkedIn = todayLogRecords.some(
            (record) => record.customerId === entry.customerId && record.status === "checked-in"
          );
          return guardian ? { name: `${guardian.firstName} ${guardian.lastName}`, checkedIn } : null;
        })
        .find(Boolean) ?? null
    : null;
  const selectedRecentVisits = useMemo(() => {
    if (!selectedCustomer) return [];
    return checkInRecords
      .filter((record) => record.customerId === selectedCustomer.id)
      .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime))
      .slice(0, 3);
  }, [checkInRecords, selectedCustomer]);
  const selectedTodayPrograms = useMemo(() => {
    if (!selectedCustomer) return [];
    const registrationsToday = registrations.filter((entry) => entry.customerId === selectedCustomer.id && entry.status !== "cancelled");
    return registrationsToday
      .map((registration) => {
        const session = sessions.find((entry) => entry.id === registration.sessionId);
        if (!session || !session.startsAt.startsWith(activeDateKey)) return null;
        const program = programs.find((entry) => entry.id === session.programId);
        return {
          id: registration.id,
          title: session.title ?? program?.title ?? "Session",
          startsAt: session.startsAt,
          status: registration.status
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [selectedCustomer, registrations, sessions, programs, activeDateKey]);
  const runningProgramsCount = useMemo(() => {
    const nowHour = new Date().getUTCHours();
    return sessions.filter((session) => {
      if (!session.startsAt.startsWith(activeDateKey)) return false;
      const startHour = new Date(session.startsAt).getUTCHours();
      const endHour = new Date(session.endsAt).getUTCHours();
      return nowHour >= startHour && nowHour <= endHour && session.status !== "cancelled";
    }).length;
  }, [sessions, activeDateKey]);
  const checkedInList = useMemo(() => {
    const base = todayLogRecords.filter((record) => record.status === "checked-in");
    const byFilter = base.filter((record) => {
      if (checkedInFilter === "all" || checkedInFilter === "facility") return true;
      const customer = customers.find((entry) => entry.id === record.customerId);
      const household = householdMembers.find((entry) => entry.customerId === record.customerId);
      const decision = evaluateCustomerEntry(record.customerId);
      if (checkedInFilter === "kids") {
        return Boolean(household && (household.memberType === "child" || household.role === "child" || household.role === "dependent"));
      }
      if (checkedInFilter === "waiver_issues") {
        return decision.reasons.some((reason) => reason.toLowerCase().includes("waiver"));
      }
      if (checkedInFilter === "program") {
        return record.entryMethod === "class_registration" || record.entryMethod === "camp_registration";
      }
      return Boolean(customer);
    });
    const q = checkedInQuery.trim().toLowerCase();
    if (!q) return byFilter;
    return byFilter.filter((record) => {
      const haystack = [
        record.customerName,
        record.membershipPassType,
        record.passProductUsed ?? "",
        record.checkedInByStaffName ?? ""
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [todayLogRecords, checkedInFilter, checkedInQuery, customers, householdMembers, evaluateCustomerEntry]);

  const checkInLabel = useMemo(() => {
    if (!selectedDecision) return "";
    if (selectedDecision.chosenAccess?.type === "membership") return "Using Monthly Membership";
    if (selectedDecision.chosenAccess?.type === "day-pass") return "Using Day Pass";
    if (selectedDecision.chosenAccess?.type === "punch-pass") {
      return `Using Punch Pass (${selectedDecision.chosenAccess.remainingPunches ?? 0} remaining)`;
    }
    if (selectedDecision.sessionAccess) return "Using Session Registration";
    return "Using available access";
  }, [selectedDecision]);
  const overrideReasonText = useMemo(() => {
    if (overrideReason === "other") return overrideOtherReason.trim();
    if (overrideReason === "staff_discretion") return "Staff discretion";
    if (overrideReason === "waiver_exception") return "Waiver exception";
    if (overrideReason === "trial_access") return "Trial access";
    return "Technical issue";
  }, [overrideReason, overrideOtherReason]);
  const isSelectedBirthday = useMemo(() => {
    if (!selectedCustomer?.dateOfBirth) return false;
    const dob = new Date(`${selectedCustomer.dateOfBirth}T00:00:00Z`);
    if (Number.isNaN(dob.getTime())) return false;
    const now = new Date();
    return now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() === dob.getUTCDate();
  }, [selectedCustomer]);

  const statusItems = selectedDecision
    ? [
        ...(selectedDecision.accessSummary.map((line) => ({ tone: line.toLowerCase().includes("missing") || line.toLowerCase().includes("expired") ? "denied" : line.toLowerCase().includes("remaining") ? "attention" : "approved", line }))),
        ...selectedDecision.reasons
          .filter((line) => !line.toLowerCase().includes("access approved"))
          .map((line) => ({ tone: "denied", line })),
        ...selectedDecision.warnings.map((line) => ({ tone: "attention", line })),
        ...(isSelectedBirthday ? [{ tone: "attention" as const, line: "Birthday today." }] : [])
      ]
    : [];

  const runCheckIn = (customerId: string, overrideReason?: string) => {
    const permission = assertPermission("checkInCustomer");
    if (!permission.ok) {
      setWarning(permission.message);
      setShowSwitchPrompt(true);
      requestStaffSwitch("Staff PIN Required");
      return;
    }

    const staffName = `${activeStaff!.firstName} ${activeStaff!.lastName}`;
    const result = checkInCustomer(customerId, {
      staffUserId: activeStaff!.id,
      staffName,
      source: "manual_search",
      overrideReason
    });
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      setShowSwitchPrompt(result.message.includes("no valid access method"));
      if (result.message.includes("no valid access method")) setSellCustomerId(customerId);
      return;
    }
    setFeedback(result.message);
    setWarning("");
    setShowSwitchPrompt(false);
    if (result.recordId) {
      const customerName = customers.find((entry) => entry.id === customerId);
      setUndoState({
        recordId: result.recordId,
        expiresAt: Date.now() + 15000,
        customerName: customerName ? `${customerName.firstName} ${customerName.lastName}` : "Customer"
      });
    }
    setQuery("");
    setSelectedCustomerId("");
    setHighlightIndex(0);
    searchInputRef.current?.focus();
    if (overrideReason) {
      logAuditEvent({
        action: "checkin.override",
        actorStaffId: activeStaff!.id,
        actorStaffName: staffName,
        targetType: "customer",
        targetId: customerId,
        reason: overrideReason
      });
    }
  };

  const handleUndo = () => {
    if (!undoState || Date.now() > undoState.expiresAt || !activeStaff) {
      setUndoState(null);
      return;
    }
    const result = checkOutRecord(undoState.recordId, activeStaff.id, `${activeStaff.firstName} ${activeStaff.lastName}`);
    setUndoState(null);
    if (result.ok) {
      setFeedback(`Undo applied. ${undoState.customerName} check-in reverted.`);
      setWarning("");
    } else {
      setWarning(result.message);
    }
  };

  const handleSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setFamilySelection([]);
    setWarning("");
    setFeedback("");
  };

  const handleFamilyCheckIn = () => {
    if (!selectedCustomer || familySelection.length === 0) return;
    const permission = assertPermission("checkInCustomer");
    if (!permission.ok) {
      setWarning(permission.message);
      setShowSwitchPrompt(true);
      requestStaffSwitch("Staff PIN Required");
      return;
    }
    const staffName = `${activeStaff!.firstName} ${activeStaff!.lastName}`;
    const result = familyCheckIn({
      actingCustomerId: selectedCustomer.id,
      memberIds: familySelection,
      staffUserId: activeStaff!.id,
      staffName
    });
    if (!result.ok) {
      setWarning(result.message);
      return;
    }
    setFeedback(result.message);
    setWarning("");
    setFamilySelection([]);
  };

  const handleCheckOut = (recordId: string) => {
    const permission = assertPermission("checkOutCustomer");
    if (!permission.ok) {
      setWarning(permission.message);
      setShowSwitchPrompt(true);
      requestStaffSwitch("Staff PIN Required");
      return;
    }

    const result = checkOutRecord(recordId, activeStaff!.id, `${activeStaff!.firstName} ${activeStaff!.lastName}`);
    if (!result.ok) {
      setWarning(result.message);
      setFeedback("");
      return;
    }
    setFeedback(result.message);
    setWarning("");
    setShowSwitchPrompt(false);
  };

  useEffect(() => {
    if (!undoState) return;
    const timeout = window.setTimeout(() => setUndoState(null), Math.max(0, undoState.expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [undoState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement !== searchInputRef.current) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (event.key === "Escape") {
        if (sellCustomerId) setSellCustomerId(null);
        if (showAddCustomer) setShowAddCustomer(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && selectedCustomer && selectedDecision?.allowed && !activeRecord) {
        event.preventDefault();
        runCheckIn(selectedCustomer.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sellCustomerId, showAddCustomer, selectedCustomer, selectedDecision, activeRecord]);

  return (
    <section className="space-y-4">
      <header className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Daily Log</p>
            <h3 className="text-xl font-semibold">{isActiveDateToday ? "Today" : activeDateKey}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={goToPreviousDay} aria-label="Previous Day">Previous</Button>
            <Button variant="outline" onClick={setToday}>Today</Button>
            <Button variant="outline" onClick={goToNextDay} aria-label="Next Day">Next</Button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Link href="/check-in#recent-checkins" data-testid="occupancy-count" className="rounded-md bg-secondary px-3 py-2 text-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="View current check-ins">
            Currently In: {occupancyCount}
          </Link>
          <p className="rounded-md bg-secondary px-3 py-2 text-sm">{occupancyBreakdown.adults} adults · {occupancyBreakdown.youth} youth</p>
          <p className="rounded-md bg-secondary px-3 py-2 text-sm">{checkedOutCount} checked out</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{totalCheckIns} total check-ins today</p>
      </header>

      {isActiveDateToday ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.9fr]">
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <SearchInput
              label="Scan barcode, member ID, phone, email, or search name"
              showLabel
              placeholder="Scan barcode, member ID, phone, email, or search name"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setHighlightIndex(0);
              }}
              autoFocus
              inputRef={searchInputRef}
              className="h-12 text-base"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlightIndex((prev) => Math.min(prev + 1, Math.max(visibleResults.length - 1, 0)));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightIndex((prev) => Math.max(prev - 1, 0));
                } else if (event.key === "Enter") {
                  if (highlighted) {
                    event.preventDefault();
                    handleSelect(highlighted.id);
                  }
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["eligible", "Eligible"],
                ["blocked", "Blocked"],
                ["checked_in", "Checked In"]
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant={quickFilter === value ? "primary" : "secondary"}
                  className="h-9"
                  onClick={() => setQuickFilter(value as typeof quickFilter)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {query.trim().length === 0 ? (
              <EmptyState title="Start typing to find a customer" description="Search by name, member ID, phone, or email." />
            ) : filteredResults.length === 0 ? (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">Customer not found</p>
                <Button variant="outline" className="min-h-11" onClick={() => setShowAddCustomer(true)}>Create Customer</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  Showing {visibleResults.length} of {filteredResults.length} matching customers
                  {filteredResults.length > maxSearchResults ? ". Refine your search to narrow results." : "."}
                </p>
                <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1 md:max-h-[420px]" role="listbox" aria-label="Customer search results">
                {visibleResults.map((customer, index) => {
                  const decision = evaluateCustomerEntry(customer.id);
                  const selected = selectedCustomerId === customer.id;
                  const highlightedRow = index === highlightIndex;
                  const membership = householdMembers.find((entry) => entry.customerId === customer.id);
                  const dob = customer.dateOfBirth ? new Date(`${customer.dateOfBirth}T00:00:00Z`) : null;
                  const age = dob && !Number.isNaN(dob.getTime())
                    ? Math.max(0, Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
                    : null;
                  const isMinor = typeof age === "number" && age < 18;
                  const preferredName = customer.preferredName?.trim();
                  const isBirthday = dob
                    ? (() => {
                        const now = new Date();
                        return now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() === dob.getUTCDate();
                      })()
                    : false;
                  return (
                    <button
                      key={customer.id}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => handleSelect(customer.id)}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${selected || highlightedRow ? "border-primary bg-secondary" : "hover:bg-secondary"}`}
                    >
                      <div className="flex items-start gap-3">
                        <CustomerAvatar customer={customer} size="sm" className="bg-card" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                          <p className="text-xs text-muted-foreground">
                            {preferredName && preferredName.toLowerCase() !== customer.firstName.toLowerCase() ? `Preferred: ${preferredName} · ` : ""}
                            {customer.pronouns || "Pronouns not set"} {isMinor ? `· Age ${age}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{customer.memberId} • {customer.phone}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className={`rounded-full px-2 py-0.5 text-xs ${decision.allowed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {decision.allowed ? "READY" : "BLOCKED"}
                            </span>
                            {decision.warnings.length > 0 || isBirthday ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">WARNING</span> : null}
                            {customer.checkInStatus === "in" ? <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-900">Checked In</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">Checked Out</span>}
                            {membership && (membership.memberType === "child" || membership.role === "dependent" || membership.role === "child") ? (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-900">Minor requires guardian</span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {(isBirthday ? "Birthday today · " : "") + (decision.accessSummary[0] ?? decision.reasons[0] ?? "No details").replace("•", "·")}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Press Enter or tap to select</p>
                    </button>
                  );
                })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-4">
            {!selectedCustomer ? (
              <EmptyState title="No customer selected" description="Select a customer from search results to review access and check in." />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <CustomerAvatar customer={selectedCustomer} size="md" />
                  <div>
                    <p className="font-semibold">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.memberId}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {statusItems.map((item, index) => (
                    <p key={`${item.line}-${index}`} className={`rounded-md px-2 py-1 text-sm ${item.tone === "approved" ? "bg-emerald-50 text-emerald-800" : item.tone === "attention" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>
                      {item.tone === "approved" ? "\u2705" : item.tone === "attention" ? "\u26A0\uFE0F" : "\u274C"} {item.line}
                    </p>
                  ))}
                </div>
                {selectedTodayPrograms.length > 0 ? (
                  <div className="rounded-lg border bg-secondary/30 p-3">
                    <p className="text-sm font-medium">Today's Programs</p>
                    <div className="mt-2 space-y-1 text-sm">
                      {selectedTodayPrograms.map((programEntry) => {
                        const startedMinutes = Math.floor((Date.now() - new Date(programEntry.startsAt).getTime()) / 60000);
                        return (
                          <div key={programEntry.id} className="rounded-md bg-card px-2 py-1">
                            <p className="font-medium">
                              {formatTime(programEntry.startsAt)} · {programEntry.title}
                            </p>
                            {startedMinutes > 0 ? (
                              <p className="text-xs text-amber-800">
                                Program started {startedMinutes} minutes ago
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <Button variant="secondary" className="mt-2 min-h-11">
                      Check Into Program
                    </Button>
                  </div>
                ) : null}
                <div className="rounded-lg border bg-secondary/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Operational Context</p>
                  <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                    <InfoField label="Pronouns" value={selectedCustomer.pronouns || "Not set"} />
                    <InfoField
                      label="DOB / Age"
                        value={selectedCustomer.dateOfBirth ? formatDateWithAge(selectedCustomer.dateOfBirth) : "Not set"}
                    />
                    <InfoField label="Phone" value={selectedCustomer.phone || "Not set"} />
                    <InfoField label="Emergency Contact" value={selectedCustomer.emergencyContactName || "Not set"} />
                    {selectedHouseholdMembership ? (
                      <InfoField
                        label="Household role"
                        value={`${selectedHouseholdMembership.memberType === "child" ? "Child" : "Adult"} · ${selectedHouseholdMembership.relationship.replace(/_/g, " ")}`}
                        className="sm:col-span-2"
                      />
                    ) : null}
                  </div>
                </div>
                {activeRecord ? (
                  <div className="space-y-2">
                    <Button className="w-full min-h-11" disabled>
                      Already Checked In
                    </Button>
                    <p className="text-sm text-muted-foreground">Checked in at {formatTime(activeRecord.checkInTime)}</p>
                  </div>
                ) : selectedDecision?.allowed ? (
                  <div className="space-y-2">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                      <p className="font-medium">Ready to check in</p>
                      <p>{checkInLabel}</p>
                    </div>
                    <Button className="w-full min-h-11" onClick={() => runCheckIn(selectedCustomer.id)}>
                      Check In
                    </Button>
                    <p className="text-sm text-muted-foreground">{checkInLabel}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <p className="font-medium">Cannot check in</p>
                      <p>{selectedDecision?.reasons[0] ?? "No valid access."}</p>
                    </div>
                    <Button className="w-full min-h-11" disabled>
                      Cannot Check In
                    </Button>
                    {selectedDecision?.reasons[0]?.toLowerCase().includes("waiver") ? (
                      <Button variant="secondary" className="w-full min-h-11">
                        Mark Waiver Signed
                      </Button>
                    ) : null}
                    {hasPermission("overrideAccess") ? (
                      <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-amber-900" htmlFor="override-reason">Override reason</label>
                        <select
                          id="override-reason"
                          value={overrideReason}
                          onChange={(event) => setOverrideReason(event.target.value as typeof overrideReason)}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="staff_discretion">Staff discretion</option>
                          <option value="waiver_exception">Waiver exception</option>
                          <option value="trial_access">Trial access</option>
                          <option value="technical_issue">Technical issue</option>
                          <option value="other">Other</option>
                        </select>
                        {overrideReason === "other" ? (
                          <input
                            aria-label="Override custom reason"
                            value={overrideOtherReason}
                            onChange={(event) => setOverrideOtherReason(event.target.value)}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            placeholder="Enter reason"
                          />
                        ) : null}
                        <Button
                          variant="caution"
                          className="w-full min-h-11"
                          onClick={() => runCheckIn(selectedCustomer.id, overrideReasonText || "Manager override")}
                          disabled={overrideReason === "other" && !overrideOtherReason.trim()}
                        >
                          Manager Override + Check In
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="secondary" className="min-h-11" onClick={() => setSellCustomerId(selectedCustomer.id)}>
                    Sell Access
                  </Button>
                  <Button variant="secondary" className="min-h-11">
                    Renew Membership
                  </Button>
                  <Button variant="secondary" className="min-h-11">
                    Mark Waiver Signed
                  </Button>
                  <Button variant="secondary" className="min-h-11">
                    Add Household Member
                  </Button>
                  <Button variant="secondary" className="min-h-11">
                    Emergency Contact
                  </Button>
                  <Link href={buildCustomerDetailHref({
                    customerId: selectedCustomer.id,
                    currentPathname: pathname,
                    currentSearch
                  })} className="inline-flex min-h-11 items-center justify-center rounded-md border px-3 text-sm font-medium">
                    View Profile
                  </Link>
                </div>
                {canActForHousehold && householdDependents.length > 0 ? (
                  <div className="space-y-2 rounded-lg border border-dashed p-3">
                    <p className="text-sm font-medium">Checking in for household</p>
                    <div className="space-y-1">
                      {householdDependents.map((entry) => (
                        <label key={entry.customerId} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={familySelection.includes(entry.customerId)}
                            onChange={(event) =>
                              setFamilySelection((prev) =>
                                event.target.checked
                                  ? [...prev, entry.customerId]
                                  : prev.filter((memberId) => memberId !== entry.customerId)
                              )
                            }
                          />
                          <span>{entry.customer?.firstName} {entry.customer?.lastName}</span>
                        </label>
                      ))}
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full min-h-11"
                      disabled={familySelection.length === 0}
                      onClick={handleFamilyCheckIn}
                    >
                      Check In Selected
                    </Button>
                  </div>
                ) : null}
                {selectedHouseholdMembership && (selectedHouseholdMembership.memberType === "child" || selectedHouseholdMembership.role === "child" || selectedHouseholdMembership.role === "dependent") ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Guardian: {activeGuardianName?.name ?? "Not linked"} {activeGuardianName && !activeGuardianName.checkedIn ? "(not currently checked in)" : ""}
                  </div>
                ) : null}
                {selectedRecentVisits.length > 0 ? (
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-sm font-medium">Check-in timeline</p>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {selectedRecentVisits.map((visit) => (
                        <p key={visit.id}>
                          {formatShortDate(visit.checkInTime)} — {formatTime(visit.checkInTime)}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <aside className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-base font-semibold">Currently Checked In</h4>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{checkedInList.length}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {[
                ["all", "All"],
                ["facility", "Facility"],
                ["program", "Program"],
                ["kids", "Kids only"],
                ["waiver_issues", "Waiver issues"]
              ].map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={checkedInFilter === value ? "primary" : "secondary"}
                  className="h-9"
                  onClick={() => setCheckedInFilter(value as typeof checkedInFilter)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <SearchInput
              label="Search checked-in roster"
              placeholder="Search currently checked in"
              value={checkedInQuery}
              onChange={setCheckedInQuery}
            />
            {checkedInList.length === 0 ? (
              <EmptyState title="No one checked in" description="Current roster is empty for this filter." />
            ) : (
              <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
                {checkedInList.map((record) => {
                  const checkInAt = new Date(record.checkInTime);
                  const visitDurationMinutes = Math.max(1, Math.floor((Date.now() - checkInAt.getTime()) / 60000));
                  const durationHours = Math.floor(visitDurationMinutes / 60);
                  const durationMinutes = visitDurationMinutes % 60;
                  const recordCustomer = customers.find((entry) => entry.id === record.customerId);
                  return (
                    <article key={record.id} className="rounded-lg border bg-secondary/20 p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CustomerAvatar
                          customer={
                            recordCustomer ?? {
                              firstName: record.customerName.split(" ")[0] ?? "",
                              lastName: record.customerName.split(" ").slice(1).join(" ") ?? "",
                              profilePhotoUrl: undefined
                            }
                          }
                          size="xs"
                        />
                        <p className="font-medium">{record.customerName}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(checkInAt)} · {record.membershipPassType}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Staff: {record.checkedInByStaffName ?? "Staff not recorded"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Visit length: {durationHours > 0 ? `${durationHours}h ` : ""}{durationMinutes}m
                      </p>
                      <Button
                        variant="secondary"
                        className="mt-2 h-9"
                        onClick={() => handleCheckOut(record.id)}
                        aria-label={`Roster Check Out ${record.customerName}`}
                      >
                        Check Out
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}
            {hasPermission("overrideAccess") && checkedInList.length > 0 ? (
              <Button
                variant="caution"
                className="w-full min-h-11"
                onClick={() => {
                  checkedInList.forEach((record) => handleCheckOut(record.id));
                }}
              >
                Check Out All
              </Button>
            ) : null}
          </aside>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Historical check-in logs are read-only.</p>
      )}

      {feedback ? (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>{feedback}</p>
          {undoState ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="secondary" className="h-9" onClick={handleUndo}>Undo</Button>
              {selectedCustomer ? <Link className="inline-flex h-9 items-center rounded-md border px-3 text-sm" href={buildCustomerDetailHref({
                customerId: selectedCustomer.id,
                currentPathname: pathname,
                currentSearch
              })}>View Customer</Link> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {warning ? (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>{warning}</p>
          {showSwitchPrompt ? (
            <div className="mt-2">
              <StaffSwitcher label="Switch Staff" title="Switch Staff PIN" />
            </div>
          ) : null}
          {warning.includes("no valid access method") && sellCustomerId ? (
            <div className="mt-2">
              <Button variant="secondary" onClick={() => setSellCustomerId(sellCustomerId)}>Sell Access</Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {todayLogRecords.length === 0 ? (
        <EmptyState title="No check-ins for this day" description="The daily log is empty for this date." />
      ) : (
        <div id="recent-checkins" className="space-y-2">
          <p className="text-sm font-medium">Recent check-ins</p>
          {todayLogRecords.map((record) => (
            <CheckInRow
              key={record.id}
              record={record}
              customer={customers.find((entry) => entry.id === record.customerId)}
              viewCustomerHref={buildCustomerDetailHref({
                customerId: record.customerId,
                currentPathname: pathname,
                currentSearch
              })}
              readOnly={!isActiveDateToday}
              onCheckOut={handleCheckOut}
            />
          ))}
        </div>
      )}
      {sellCustomer ? (
        <SellAccessModal
          open
          onClose={() => setSellCustomerId(null)}
          customer={sellCustomer}
          products={accessProducts}
          canUsePOS={hasPermission("usePOS")}
          canOverrideAccess={hasPermission("overrideAccess")}
          onSubmit={({ productIds, checkInAfterSale }) => {
            if (!activeStaff) {
              requestStaffSwitch("Staff PIN Required");
              return { ok: false, message: "Select staff PIN to continue.", transaction: null };
            }
            const result = sellAccessProducts({
              customerId: sellCustomer.id,
              productIds,
              soldByStaffId: activeStaff.id,
              soldByStaffName: `${activeStaff.firstName} ${activeStaff.lastName}`,
              checkInAfterSale
            });
            if (result.ok) {
              setFeedback(result.message);
              setWarning("");
              setShowSwitchPrompt(false);
            } else {
              setWarning(result.message);
            }
            return { ...result, transaction: result.transaction ?? null };
          }}
        />
      ) : null}
      {showAddCustomer ? (
        <AddCustomerModal
          open
          onClose={() => setShowAddCustomer(false)}
          customers={customers}
          onCreate={(input) => {
            const result = addCustomer({
              ...input,
              createdByStaffId: activeStaff?.id,
              createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
            });
            if (result.ok && result.customerId) {
              setQuery(`${input.firstName} ${input.lastName}`);
              setFeedback(result.message);
              setWarning("");
            }
            return result;
          }}
          title="New Customer"
          onCreated={(customerId, input) => {
            setQuery(`${input.firstName} ${input.lastName}`.trim());
            setSelectedCustomerId(customerId);
            setFeedback("Customer created.");
            setWarning("");
          }}
          quickActions={{
            onSellAccess: (customerId) => setSellCustomerId(customerId),
            onCheckIn: (customerId) => runCheckIn(customerId)
          }}
        />
      ) : null}
    </section>
  );
}
