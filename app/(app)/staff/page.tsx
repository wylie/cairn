"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { CustomerSearchCombobox } from "@/components/shared/customer-search-combobox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModalShell } from "@/components/ui/modal-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGate } from "@/components/staff/permission-gate";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { useCustomerState } from "@/lib/state/customer-state";
import { ROLE_LABELS } from "@/lib/staff/capabilities";
import { filterCustomers } from "@/lib/data/customer-search";
import type { StaffRole } from "@/types/domain";
import { CheckboxField, FormField, FormGrid, SelectInput, TextInput } from "@/components/shared/form-layout";

function formatLastActive(value?: string) {
  if (!value) return "No recent activity";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function StaffPage() {
  const { activeStaff, hasPermission, addStaffMember } = useWorkstationState();
  const { customers, sessions, programs, addCustomer, addStaffProfileToCustomer } = useCustomerState();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [showInvite, setShowInvite] = useState(false);
  const [staffLinkMode, setStaffLinkMode] = useState<"link" | "create">("link");
  const [existingSearchQuery, setExistingSearchQuery] = useState("");
  const [feedback, setFeedback] = useState("");
  const [warning, setWarning] = useState("");
  const [inviteValues, setInviteValues] = useState({
    firstName: "",
    lastName: "",
    preferredName: "",
    dateOfBirth: "",
    role: "front_desk" as StaffRole,
    email: "",
    phone: "",
    pronouns: "",
    locationIds: ["loc_001"] as string[],
    existingCustomerId: ""
  });

  const canManageRoles = hasPermission("manageRoles") || activeStaff?.role === "owner";

  const locationName = (id: string) => (id === "loc_001" ? "Summit Downtown" : id === "loc_002" ? "Summit Uptown" : id);
  const assignedProgramsByStaff = useMemo(() => {
    const map = new Map<string, string[]>();
    sessions.forEach((session) => {
      if (!session.instructorStaffId) return;
      const programTitle = programs.find((entry) => entry.id === session.programId)?.title ?? "Program";
      const current = map.get(session.instructorStaffId) ?? [];
      if (!current.includes(programTitle)) current.push(programTitle);
      map.set(session.instructorStaffId, current);
    });
    return map;
  }, [sessions, programs]);

  const staffPeople = useMemo(() => customers.filter((entry) => entry.staffProfile?.isStaff), [customers]);
  const nonStaffPeople = useMemo(() => customers.filter((entry) => !entry.staffProfile?.isStaff), [customers]);
  const existingPersonResults = useMemo(
    () => (existingSearchQuery.trim() ? filterCustomers(nonStaffPeople, existingSearchQuery).slice(0, 8) : []),
    [existingSearchQuery, nonStaffPeople]
  );
  const selectedExistingPerson = useMemo(
    () => nonStaffPeople.find((entry) => entry.id === inviteValues.existingCustomerId) ?? null,
    [inviteValues.existingCustomerId, nonStaffPeople]
  );

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staffPeople.filter((person) => {
      const staffRole = person.staffProfile?.role;
      const staffStatus = person.staffProfile?.status ?? "active";
      if (!staffRole) return false;
      if (roleFilter !== "all" && staffRole !== roleFilter) return false;
      if (statusFilter === "active" && staffStatus !== "active") return false;
      if (statusFilter === "inactive" && staffStatus === "active") return false;
      if (!q) return true;
      const haystack = [person.firstName, person.lastName, person.email, person.phone ?? "", ROLE_LABELS[staffRole]].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [staffPeople, query, roleFilter, statusFilter]);

  return (
    <PermissionGate permission="manageStaff">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeader title="Staff" description="Manage roles, permissions, and operational access by location." />
          <Button onClick={() => setShowInvite(true)}>Add Staff</Button>
        </div>

        <Card>
          <CardContent className="pt-5">
            <FormGrid className="grid-cols-1 md:grid-cols-5">
              <FormField label="Search staff" className="md:col-span-2">
                <SearchInput label="Search staff" showLabel={false} value={query} onChange={setQuery} placeholder="Search name, role, email, phone" className="h-11" />
              </FormField>
              <FormField label="Role">
                <SelectInput aria-label="Role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}>
                  <option value="all">All roles</option>
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="front_desk">Front Desk</option>
                  <option value="instructor">Instructor</option>
                  <option value="volunteer_limited">Volunteer</option>
                </SelectInput>
              </FormField>
              <FormField label="Status">
                <SelectInput aria-label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Suspended</option>
                </SelectInput>
              </FormField>
              <FormField label="View">
                <div className="flex gap-2">
                  <Button variant={view === "cards" ? "primary" : "secondary"} className="h-11 flex-1" onClick={() => setView("cards")}>Cards</Button>
                  <Button variant={view === "table" ? "primary" : "secondary"} className="h-11 flex-1" onClick={() => setView("table")}>Table</Button>
                </div>
              </FormField>
            </FormGrid>
          </CardContent>
        </Card>

        {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}
        {warning ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p> : null}

        {view === "cards" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredStaff.map((person) => {
              const staff = person.staffProfile!;
              const assignedPrograms = assignedProgramsByStaff.get(staff.staffId) ?? staff.assignedPrograms ?? [];
              return (
                <Card key={person.id} aria-label={`staff-card-${person.id}`}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold">{person.firstName} {person.lastName}</p>
                        <p className="text-sm text-muted-foreground">{ROLE_LABELS[staff.role]}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone="muted">Staff: {ROLE_LABELS[staff.role]}</Badge>
                        <Badge tone={staff.status === "active" ? "success" : "muted"}>{staff.status === "active" ? "Active" : "Suspended"}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <p><span className="text-muted-foreground">Email:</span> {person.email}</p>
                      <p><span className="text-muted-foreground">Phone:</span> {person.phone ?? "Not set"}</p>
                      <p className="sm:col-span-2"><span className="text-muted-foreground">Locations:</span> {staff.locations.map(locationName).join(", ")}</p>
                      <p><span className="text-muted-foreground">Last active:</span> {formatLastActive(staff.lastActive)}</p>
                      <p className="sm:col-span-2"><span className="text-muted-foreground">Assigned programs:</span> {assignedPrograms.length > 0 ? assignedPrograms.join(", ") : "None assigned"}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/customers/${person.id}#staff-profile`} className="inline-flex h-10 items-center rounded-md border border-input px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60">View Profile</Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-5">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Role</th>
                      <th className="pb-2">Location(s)</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Last active</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((person) => {
                      const staff = person.staffProfile!;
                      return (
                        <tr key={person.id} className="border-t">
                          <td className="py-2">{person.firstName} {person.lastName}</td>
                          <td className="py-2">{ROLE_LABELS[staff.role]}</td>
                          <td className="py-2">{staff.locations.map(locationName).join(", ")}</td>
                          <td className="py-2">{staff.status === "active" ? "Active" : "Suspended"}</td>
                          <td className="py-2">{formatLastActive(staff.lastActive)}</td>
                          <td className="py-2">
                            <Link href={`/customers/${person.id}#staff-profile`} className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60">View Profile</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {showInvite ? (
          <ModalShell
            open={showInvite}
            ariaLabel="Add Staff"
            title="Add Staff"
            description="Link an existing person or create a new person, then assign staff role and locations."
            onClose={() => setShowInvite(false)}
            maxWidthClassName="max-w-3xl"
            footer={
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    let customerId = inviteValues.existingCustomerId;
                    if (!customerId) {
                      const created = addCustomer({
                        firstName: inviteValues.firstName,
                        lastName: inviteValues.lastName,
                        preferredName: inviteValues.preferredName || inviteValues.firstName,
                        pronouns: inviteValues.pronouns || "Prefer not to say",
                        email: inviteValues.email,
                        phone: inviteValues.phone || "(828) 555-0001",
                        dateOfBirth: inviteValues.dateOfBirth || "1990-01-01",
                        addressLine1: "100 Main St",
                        city: "Asheville",
                        state: "NC",
                        postalCode: "28801",
                        emergencyContactName: "Emergency Contact",
                        emergencyContactPhone: "(828) 555-0000",
                        createdByStaffId: activeStaff?.id,
                        createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                      });
                      if (!created.ok || !created.customerId) {
                        setWarning(created.message);
                        setFeedback("");
                        return;
                      }
                      customerId = created.customerId;
                    }
                    const staffResult = addStaffMember(inviteValues);
                    if (!staffResult.ok || !staffResult.staffId || !customerId) {
                      setWarning(staffResult.message);
                      setFeedback("");
                      return;
                    }
                    const newPin = staffResult.message.match(/PIN:\s*(\d{4})/)?.[1] ?? "0000";
                    const promoteResult = addStaffProfileToCustomer({
                      customerId,
                      staffId: staffResult.staffId,
                      role: inviteValues.role,
                      status: "active",
                      staffPin: newPin,
                      locations: inviteValues.locationIds
                    });
                    if (!promoteResult.ok) {
                      setWarning(promoteResult.message);
                      setFeedback("");
                      return;
                    }
                    setFeedback(staffResult.message);
                    setWarning("");
                    setShowInvite(false);
                    setStaffLinkMode("link");
                    setExistingSearchQuery("");
                    setInviteValues({
                      firstName: "",
                      lastName: "",
                      preferredName: "",
                      dateOfBirth: "",
                      role: "front_desk",
                      email: "",
                      phone: "",
                      pronouns: "",
                      locationIds: ["loc_001"],
                      existingCustomerId: ""
                    });
                  }}
                >
                  Add Staff
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant={staffLinkMode === "link" ? "primary" : "secondary"} onClick={() => setStaffLinkMode("link")}>Link Existing Person</Button>
                <Button variant={staffLinkMode === "create" ? "primary" : "secondary"} onClick={() => setStaffLinkMode("create")}>Create New Person</Button>
              </div>

              {staffLinkMode === "link" ? (
                <div className="space-y-3">
                  <CustomerSearchCombobox
                    label="Search existing customer by name, phone, email, or member ID"
                    placeholder="Search existing customer by name, phone, email, or member ID"
                    showLabel
                    query={existingSearchQuery}
                    onQueryChange={setExistingSearchQuery}
                    customers={existingPersonResults}
                    onSelect={(customerId) => {
                      const person = nonStaffPeople.find((entry) => entry.id === customerId);
                      setInviteValues((prev) => ({
                        ...prev,
                        existingCustomerId: customerId,
                        firstName: person?.firstName ?? prev.firstName,
                        lastName: person?.lastName ?? prev.lastName,
                        preferredName: person?.preferredName ?? prev.preferredName,
                        dateOfBirth: person?.dateOfBirth ?? prev.dateOfBirth,
                        email: person?.email ?? prev.email,
                        phone: person?.phone ?? prev.phone,
                        pronouns: person?.pronouns ?? prev.pronouns
                      }));
                      setExistingSearchQuery("");
                    }}
                    emptyMessage="No matching people found."
                  />
                  {selectedExistingPerson ? (
                    <div className="rounded-lg border bg-secondary/30 p-3 text-sm">
                      <p className="font-medium">{selectedExistingPerson.firstName} {selectedExistingPerson.lastName}</p>
                      <p className="text-muted-foreground">{selectedExistingPerson.memberId} • {selectedExistingPerson.phone} • {selectedExistingPerson.email}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No person selected yet. Use search above to link an existing person.</p>
                  )}
                </div>
              ) : (
                <FormGrid>
                  <FormField label="First name">
                    <TextInput value={inviteValues.firstName} onChange={(event) => setInviteValues((prev) => ({ ...prev, firstName: event.target.value }))} />
                  </FormField>
                  <FormField label="Last name">
                    <TextInput value={inviteValues.lastName} onChange={(event) => setInviteValues((prev) => ({ ...prev, lastName: event.target.value }))} />
                  </FormField>
                  <FormField label="Preferred name">
                    <TextInput value={inviteValues.preferredName} onChange={(event) => setInviteValues((prev) => ({ ...prev, preferredName: event.target.value }))} />
                  </FormField>
                  <FormField label="Date of birth">
                    <TextInput type="date" value={inviteValues.dateOfBirth} onChange={(event) => setInviteValues((prev) => ({ ...prev, dateOfBirth: event.target.value }))} />
                  </FormField>
                  <FormField label="Email">
                    <TextInput value={inviteValues.email} onChange={(event) => setInviteValues((prev) => ({ ...prev, email: event.target.value }))} />
                  </FormField>
                  <FormField label="Phone">
                    <TextInput value={inviteValues.phone} onChange={(event) => setInviteValues((prev) => ({ ...prev, phone: event.target.value }))} />
                  </FormField>
                  <FormField label="Pronouns">
                    <TextInput value={inviteValues.pronouns} onChange={(event) => setInviteValues((prev) => ({ ...prev, pronouns: event.target.value }))} />
                  </FormField>
                </FormGrid>
              )}

              <FormGrid>
                <FormField label="Role">
                  <SelectInput aria-label="Role" value={inviteValues.role} onChange={(event) => setInviteValues((prev) => ({ ...prev, role: event.target.value as StaffRole }))}>
                    <option value="front_desk">Front Desk</option>
                    <option value="instructor">Instructor</option>
                    <option value="manager">Manager</option>
                    {activeStaff?.role === "owner" ? <option value="owner">Owner</option> : null}
                    <option value="volunteer_limited">Volunteer</option>
                  </SelectInput>
                </FormField>
              </FormGrid>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Locations</p>
                <CheckboxField
                  label="Summit Downtown"
                  checked={inviteValues.locationIds.includes("loc_001")}
                  onChange={(checked) => setInviteValues((prev) => ({ ...prev, locationIds: checked ? Array.from(new Set([...prev.locationIds, "loc_001"])) : prev.locationIds.filter((id) => id !== "loc_001") }))}
                />
                <CheckboxField
                  label="Summit Uptown"
                  checked={inviteValues.locationIds.includes("loc_002")}
                  onChange={(checked) => setInviteValues((prev) => ({ ...prev, locationIds: checked ? Array.from(new Set([...prev.locationIds, "loc_002"])) : prev.locationIds.filter((id) => id !== "loc_002") }))}
                />
              </div>
            </div>
          </ModalShell>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>
              Default roles and permission presets. Custom roles coming later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {canManageRoles ? (
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-md bg-secondary/40 px-3 py-2"><p className="font-medium">Owner</p><p className="text-muted-foreground">Full system access</p></div>
                <div className="rounded-md bg-secondary/40 px-3 py-2"><p className="font-medium">Manager</p><p className="text-muted-foreground">Operational + advanced controls</p></div>
                <div className="rounded-md bg-secondary/40 px-3 py-2"><p className="font-medium">Front Desk</p><p className="text-muted-foreground">Check-in, POS, customer ops</p></div>
                <div className="rounded-md bg-secondary/40 px-3 py-2"><p className="font-medium">Instructor / Coach</p><p className="text-muted-foreground">Roster and attendance</p></div>
                <div className="rounded-md bg-secondary/40 px-3 py-2"><p className="font-medium">Volunteer</p><p className="text-muted-foreground">Limited attendance visibility</p></div>
              </div>
            ) : (
              <p className="text-muted-foreground">Only owners can manage role presets.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </PermissionGate>
  );
}
