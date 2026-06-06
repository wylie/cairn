"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CalendarClock,
  CircleAlert,
  Copy,
  FileText,
  Mail,
  MessageSquare,
  Search,
  Send,
  Users
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PermissionGate } from "@/components/staff/permission-gate";
import { formatDateTime } from "@/lib/format/date";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import type { CommunicationRecord, CommunicationRecipient, CommunicationRecipientType, CommunicationTemplateType } from "@/types/domain";

const dashboardLinks = [
  { key: "sent", title: "Sent Today", hint: "View sent messages", icon: Send },
  { key: "scheduled", title: "Scheduled", hint: "View scheduled messages", icon: CalendarClock },
  { key: "failed", title: "Failed", hint: "View failed messages", icon: CircleAlert },
  { key: "draft", title: "Drafts", hint: "View drafts", icon: FileText },
  { key: "waiver", title: "Waiver Reminders Due", hint: "View waiver reminders", icon: Bell },
  { key: "membership", title: "Membership Reminders Due", hint: "View membership reminders", icon: Mail },
  { key: "waitlist", title: "Waitlist Messages Due", hint: "View waitlist outreach", icon: Users }
] as const;

type DashboardLinkKey = (typeof dashboardLinks)[number]["key"];

type RecipientOption = {
  id: string;
  label: string;
  helper: string;
  recipientType: CommunicationRecipientType;
  recipients?: CommunicationRecipient[];
  customerId?: string;
  householdId?: string;
  programId?: string;
  sessionId?: string;
  membershipId?: string;
  staffUserId?: string;
  segmentKey?: string;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function channelIcon(channel: CommunicationRecord["channel"]) {
  switch (channel) {
    case "email":
      return Mail;
    case "sms":
      return MessageSquare;
    case "in_app_notification":
    case "system_notification":
      return Bell;
    default:
      return FileText;
  }
}

function isWithinDateRange(value: string | undefined, from?: string, to?: string) {
  if (!value) return true;
  const key = value.slice(0, 10);
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

export default function CommunicationsPage() {
  const {
    communications,
    communicationTemplates,
    customers,
    households,
    householdMembers,
    sessions,
    programs,
    memberships,
    waiverTemplates,
    operationsAlerts,
    createCommunication,
    updateCommunication
  } = useCustomerState();
  const { activeStaff, hasPermission } = useWorkstationState();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? "/communications";

  const canManage = hasPermission("manageCommunications");
  const canSendTransactional = hasPermission("sendTransactionalMessages") || canManage;
  const canMessageParticipants = hasPermission("messageAssignedParticipants") || canManage;
  const composerPermission = canManage ? "manageCommunications" : canSendTransactional ? "sendTransactionalMessages" : "messageAssignedParticipants";
  const availableAudienceOptions = useMemo<Array<[CommunicationRecipientType, string]>>(() => {
    if (canManage) {
      return [
        ["customer", "Individual customer"],
        ["household", "Household"],
        ["program_participants", "Program participants"],
        ["session_roster", "Session roster"],
        ["waitlist", "Waitlist"],
        ["guardians", "Guardians"],
        ["membership_holders", "Membership holders"],
        ["staff", "Staff"],
        ["saved_segment", "Saved segment"]
      ];
    }
    if (canSendTransactional) {
      return [
        ["customer", "Individual customer"],
        ["household", "Household"],
        ["session_roster", "Session roster"],
        ["waitlist", "Waitlist"]
      ];
    }
    return [
      ["program_participants", "Program participants"],
      ["session_roster", "Session roster"],
      ["waitlist", "Waitlist"],
      ["guardians", "Guardians"]
    ];
  }, [canManage, canSendTransactional]);

  const [query, setQuery] = useState(searchParams?.get("query") ?? "");
  const [channelFilter, setChannelFilter] = useState(searchParams?.get("type") ?? "all");
  const [statusFilter, setStatusFilter] = useState(searchParams?.get("status") ?? "all");
  const [sourceFilter, setSourceFilter] = useState(searchParams?.get("source") ?? "all");
  const [recipientFilter, setRecipientFilter] = useState(searchParams?.get("recipient") ?? "");
  const [programFilter, setProgramFilter] = useState(searchParams?.get("program") ?? "all");
  const [membershipFilter, setMembershipFilter] = useState(searchParams?.get("membership") ?? "all");
  const [waiverFilter, setWaiverFilter] = useState(searchParams?.get("waiver") ?? "all");
  const [dateFrom, setDateFrom] = useState(searchParams?.get("from") ?? "");
  const [dateTo, setDateTo] = useState(searchParams?.get("to") ?? "");
  const [selectedCommunicationId, setSelectedCommunicationId] = useState(searchParams?.get("message") ?? "");
  const [feedback, setFeedback] = useState("");

  const [selectedTemplateType, setSelectedTemplateType] = useState<CommunicationTemplateType>("general_announcement");
  const [composerChannel, setComposerChannel] = useState<CommunicationRecord["channel"]>("email");
  const [composerRecipientType, setComposerRecipientType] = useState<CommunicationRecipientType>("customer");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [selectedHouseholdDelivery, setSelectedHouseholdDelivery] = useState<"primary_contact" | "all_adults" | "all_members">("primary_contact");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!availableAudienceOptions.some(([value]) => value === composerRecipientType)) {
      setComposerRecipientType(availableAudienceOptions[0]?.[0] ?? "customer");
      setSelectedRecipientId("");
    }
  }, [availableAudienceOptions, composerRecipientType]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set("query", query); else next.delete("query");
    if (channelFilter !== "all") next.set("type", channelFilter); else next.delete("type");
    if (statusFilter !== "all") next.set("status", statusFilter); else next.delete("status");
    if (sourceFilter !== "all") next.set("source", sourceFilter); else next.delete("source");
    if (recipientFilter) next.set("recipient", recipientFilter); else next.delete("recipient");
    if (programFilter !== "all") next.set("program", programFilter); else next.delete("program");
    if (membershipFilter !== "all") next.set("membership", membershipFilter); else next.delete("membership");
    if (waiverFilter !== "all") next.set("waiver", waiverFilter); else next.delete("waiver");
    if (dateFrom) next.set("from", dateFrom); else next.delete("from");
    if (dateTo) next.set("to", dateTo); else next.delete("to");
    if (selectedCommunicationId) next.set("message", selectedCommunicationId); else next.delete("message");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [channelFilter, dateFrom, dateTo, membershipFilter, pathname, programFilter, query, recipientFilter, router, selectedCommunicationId, sourceFilter, statusFilter, waiverFilter]);

  const recipientOptions = useMemo<RecipientOption[]>(() => {
    const householdsById = new Map(households.map((entry) => [entry.id, entry]));
    switch (composerRecipientType) {
      case "customer":
        return customers.map((entry) => ({
          id: entry.id,
          label: `${entry.firstName} ${entry.lastName}`,
          helper: `${entry.memberId} · ${entry.email || entry.phone}`,
          recipientType: "customer",
          customerId: entry.id,
          recipients: [{ id: entry.id, type: "customer", label: `${entry.firstName} ${entry.lastName}`, customerId: entry.id, email: entry.email, phone: entry.phone }]
        }));
      case "household":
        return households.map((entry) => {
          const members = householdMembers
            .filter((member) => member.householdId === entry.id)
            .map((member) => customers.find((customer) => customer.id === member.customerId))
            .filter(Boolean);
          return {
            id: entry.id,
            label: entry.householdName,
            helper: `${members.length} members`,
            recipientType: "household",
            householdId: entry.id,
            recipients: members.map((member) => ({
              id: member!.id,
              type: "customer" as const,
              label: `${member!.firstName} ${member!.lastName}`,
              customerId: member!.id,
              householdId: entry.id,
              email: member!.email,
              phone: member!.phone
            }))
          };
        });
      case "program_participants":
        return programs.map((entry) => ({
          id: entry.id,
          label: entry.title,
          helper: entry.category,
          recipientType: "program_participants",
          programId: entry.id
        }));
      case "session_roster":
        return sessions.map((entry) => ({
          id: entry.id,
          label: entry.title?.trim() || programs.find((program) => program.id === entry.programId)?.title || "Session roster",
          helper: formatDateTime(entry.startsAt),
          recipientType: "session_roster",
          sessionId: entry.id,
          programId: entry.programId
        }));
      case "waitlist":
        return sessions.filter((entry) => entry.waitlistEnabled).map((entry) => ({
          id: entry.id,
          label: entry.title?.trim() || programs.find((program) => program.id === entry.programId)?.title || "Waitlist",
          helper: `Waitlist · ${formatDateTime(entry.startsAt)}`,
          recipientType: "waitlist",
          sessionId: entry.id,
          programId: entry.programId
        }));
      case "guardians":
        return sessions.map((entry) => ({
          id: entry.id,
          label: entry.title?.trim() || programs.find((program) => program.id === entry.programId)?.title || "Guardians",
          helper: `Guardians for ${formatDateTime(entry.startsAt)}`,
          recipientType: "guardians",
          sessionId: entry.id,
          programId: entry.programId
        }));
      case "membership_holders":
        return memberships.map((entry) => ({
          id: entry.id,
          label: entry.planName,
          helper: `${entry.status} · ${entry.expirationDate ?? "No expiration"}`,
          recipientType: "membership_holders",
          membershipId: entry.id
        }));
      case "staff":
        return [{ id: "staff_all", label: "All active staff", helper: "Staff updates and internal notes", recipientType: "staff", staffUserId: "staff_all" }];
      case "saved_segment":
        return [
          { id: "expiring_memberships", label: "Expiring memberships", helper: "Next 30 days", recipientType: "saved_segment", segmentKey: "expiring_memberships" },
          { id: "missing_waivers", label: "Missing waivers", helper: "Customers with missing waivers", recipientType: "saved_segment", segmentKey: "missing_waivers" },
          { id: "open_waitlists", label: "Open waitlists", helper: "Customers on waitlists", recipientType: "saved_segment", segmentKey: "open_waitlists" }
        ];
      case "selected_household_members":
        return householdsById.size > 0
          ? households.map((entry) => ({
              id: entry.id,
              label: `${entry.householdName} members`,
              helper: "Select members in household detail later",
              recipientType: "selected_household_members",
              householdId: entry.id
            }))
          : [];
      default:
        return [];
    }
  }, [composerRecipientType, customers, householdMembers, households, memberships, programs, sessions]);

  const filteredRecipientOptions = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    if (!q) return recipientOptions.slice(0, 40);
    return recipientOptions.filter((entry) => `${entry.label} ${entry.helper}`.toLowerCase().includes(q)).slice(0, 40);
  }, [recipientOptions, recipientSearch]);

  const selectedRecipientOption = useMemo(
    () => recipientOptions.find((entry) => entry.id === selectedRecipientId) ?? null,
    [recipientOptions, selectedRecipientId]
  );

  const filteredCommunications = useMemo(() => {
    const q = query.trim().toLowerCase();
    return communications.filter((entry) => {
      if (channelFilter !== "all" && entry.channel !== channelFilter) return false;
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;
      if (sourceFilter !== "all" && (entry.source ?? "manual") !== sourceFilter) return false;
      if (recipientFilter && !entry.recipientLabel.toLowerCase().includes(recipientFilter.toLowerCase())) return false;
      if (programFilter !== "all" && entry.programId !== programFilter) return false;
      if (membershipFilter !== "all" && entry.membershipId !== membershipFilter) return false;
      if (waiverFilter !== "all" && entry.waiverTemplateId !== waiverFilter) return false;
      const primaryDate = entry.sentAt ?? entry.scheduledFor ?? entry.createdAt;
      if (!isWithinDateRange(primaryDate, dateFrom || undefined, dateTo || undefined)) return false;
      if (!q) return true;
      return [
        entry.subject,
        entry.message,
        entry.recipientLabel,
        entry.createdByStaffName ?? "",
        entry.source ?? "manual"
      ].join(" ").toLowerCase().includes(q);
    });
  }, [channelFilter, communications, dateFrom, dateTo, membershipFilter, programFilter, query, recipientFilter, sourceFilter, statusFilter, waiverFilter]);

  const selectedCommunication = useMemo(
    () => filteredCommunications.find((entry) => entry.id === selectedCommunicationId) ?? filteredCommunications[0] ?? null,
    [filteredCommunications, selectedCommunicationId]
  );

  useEffect(() => {
    if (!selectedCommunicationId && filteredCommunications[0]) {
      setSelectedCommunicationId(filteredCommunications[0].id);
    }
  }, [filteredCommunications, selectedCommunicationId]);

  const metrics = useMemo(() => {
    const scheduled = communications.filter((entry) => entry.status === "scheduled");
    return {
      sentToday: communications.filter((entry) => entry.status === "sent" && Boolean(entry.sentAt?.slice(0, 10) === new Date().toISOString().slice(0, 10))).length,
      scheduled: scheduled.length,
      failed: communications.filter((entry) => entry.status === "failed").length,
      drafts: communications.filter((entry) => entry.status === "draft").length,
      waiverDue: scheduled.filter((entry) => entry.source === "waiver_reminder").length,
      membershipDue: scheduled.filter((entry) => entry.source === "membership_reminder").length,
      waitlistDue: scheduled.filter((entry) => entry.source === "waitlist_confirmation" || entry.source === "waitlist_promotion").length
    };
  }, [communications]);

  const applyDashboardFilter = (key: DashboardLinkKey) => {
    if (key === "sent") setStatusFilter("sent");
    if (key === "scheduled") setStatusFilter("scheduled");
    if (key === "failed") setStatusFilter("failed");
    if (key === "draft") setStatusFilter("draft");
    if (key === "waiver") {
      setStatusFilter("scheduled");
      setSourceFilter("waiver_reminder");
    }
    if (key === "membership") {
      setStatusFilter("scheduled");
      setSourceFilter("membership_reminder");
    }
    if (key === "waitlist") {
      setStatusFilter("scheduled");
      setSourceFilter("waitlist_promotion");
    }
  };

  const handleTemplateChange = (templateType: CommunicationTemplateType) => {
    setSelectedTemplateType(templateType);
    const template = communicationTemplates.find((entry) => entry.type === templateType);
    if (!template) return;
    setSubject(template.subject);
    setMessage(template.body);
  };

  const buildRecipients = (): CommunicationRecipient[] => {
    if (!selectedRecipientOption) return [] as CommunicationRecipient[];
    if (composerRecipientType === "household" && selectedRecipientOption.householdId) {
      const memberRows = householdMembers.filter((entry) => entry.householdId === selectedRecipientOption.householdId);
      const members = memberRows
        .map((entry) => customers.find((customer) => customer.id === entry.customerId))
        .filter(Boolean);
      if (selectedHouseholdDelivery === "primary_contact") {
        const household = households.find((entry) => entry.id === selectedRecipientOption.householdId);
        const primary = customers.find((entry) => entry.id === household?.primaryContactCustomerId);
        return primary
          ? [{ id: primary.id, type: "customer" as const, label: `${primary.firstName} ${primary.lastName}`, customerId: primary.id, householdId: selectedRecipientOption.householdId, email: primary.email, phone: primary.phone }]
          : [];
      }
      if (selectedHouseholdDelivery === "all_adults") {
        return memberRows
          .filter((entry) => entry.memberType === "adult")
          .map((entry) => customers.find((customer) => customer.id === entry.customerId))
          .filter(Boolean)
          .map((entry) => ({ id: entry!.id, type: "customer" as const, label: `${entry!.firstName} ${entry!.lastName}`, customerId: entry!.id, householdId: selectedRecipientOption.householdId, email: entry!.email, phone: entry!.phone }));
      }
      return members.map((entry) => ({ id: entry!.id, type: "customer" as const, label: `${entry!.firstName} ${entry!.lastName}`, customerId: entry!.id, householdId: selectedRecipientOption.householdId, email: entry!.email, phone: entry!.phone }));
    }
    return selectedRecipientOption.recipients ?? [];
  };

  const submitCommunication = (status: CommunicationRecord["status"]) => {
    if (!selectedRecipientOption) {
      setFeedback("Select a recipient.");
      return;
    }
    const recipients = buildRecipients();
    const result = createCommunication({
      channel: composerChannel,
      status,
      recipientType: composerRecipientType,
      recipientLabel: selectedRecipientOption.label,
      subject,
      message,
      recipients,
      customerId: selectedRecipientOption.customerId,
      householdId: selectedRecipientOption.householdId,
      programId: selectedRecipientOption.programId,
      sessionId: selectedRecipientOption.sessionId,
      membershipId: selectedRecipientOption.membershipId,
      staffUserId: selectedRecipientOption.staffUserId,
      segmentKey: selectedRecipientOption.segmentKey,
      templateType: selectedTemplateType,
      createdByStaffId: activeStaff?.id,
      createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff",
      source: status === "draft" ? "manual" : undefined,
      relatedRecords: [
        ...(selectedRecipientOption.customerId ? [{ kind: "customer", id: selectedRecipientOption.customerId, label: selectedRecipientOption.label } as const] : []),
        ...(selectedRecipientOption.householdId ? [{ kind: "household", id: selectedRecipientOption.householdId, label: selectedRecipientOption.label } as const] : []),
        ...(selectedRecipientOption.programId ? [{ kind: "program", id: selectedRecipientOption.programId, label: selectedRecipientOption.label } as const] : []),
        ...(selectedRecipientOption.sessionId ? [{ kind: "session", id: selectedRecipientOption.sessionId, label: selectedRecipientOption.label } as const] : []),
        ...(selectedRecipientOption.membershipId ? [{ kind: "membership", id: selectedRecipientOption.membershipId, label: selectedRecipientOption.label } as const] : [])
      ]
    });
    setFeedback(result.message);
    if (result.ok && result.communicationId) setSelectedCommunicationId(result.communicationId);
  };

  const duplicateSelected = () => {
    if (!selectedCommunication) return;
    setSelectedTemplateType(selectedCommunication.templateType ?? "custom");
    setComposerChannel(selectedCommunication.channel);
    setSubject(selectedCommunication.subject);
    setMessage(selectedCommunication.body ?? selectedCommunication.message);
    setFeedback("Message copied into composer.");
  };

  const resendSelected = () => {
    if (!selectedCommunication) return;
    const result = createCommunication({
      channel: selectedCommunication.channel,
      status: "sent",
      recipientType: selectedCommunication.recipientType,
      recipientLabel: selectedCommunication.recipientLabel,
      subject: selectedCommunication.subject,
      message: selectedCommunication.body ?? selectedCommunication.message,
      recipients: selectedCommunication.recipients,
      customerId: selectedCommunication.customerId,
      householdId: selectedCommunication.householdId,
      sessionId: selectedCommunication.sessionId,
      programId: selectedCommunication.programId,
      membershipId: selectedCommunication.membershipId,
      waiverTemplateId: selectedCommunication.waiverTemplateId,
      registrationId: selectedCommunication.registrationId,
      transactionId: selectedCommunication.transactionId,
      alertId: selectedCommunication.alertId,
      templateType: selectedCommunication.templateType,
      source: selectedCommunication.source,
      isTransactional: selectedCommunication.isTransactional,
      relatedRecords: selectedCommunication.relatedRecords,
      createdByStaffId: activeStaff?.id,
      createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff"
    });
    setFeedback(result.message === "Message sent." ? "Resend placeholder completed." : result.message);
  };

  const cancelSelected = () => {
    if (!selectedCommunication) return;
    const result = updateCommunication(selectedCommunication.id, {
      status: "cancelled",
      cancelledAt: new Date().toISOString()
    });
    setFeedback(result.message);
  };

  const archiveSelected = () => {
    if (!selectedCommunication) return;
    const result = updateCommunication(selectedCommunication.id, {
      archivedAt: new Date().toISOString()
    });
    setFeedback(result.message === "Communication updated." ? "Message archived." : result.message);
  };

  const visibleAutomations = [
    "Membership expiring in 30 days",
    "Membership expiring in 7 days",
    "Waiver expiring in 30 days",
    "Waiver missing",
    "Registration confirmation",
    "Waitlist promotion",
    "Program cancellation",
    "Birthday today",
    "Payment reminder"
  ];

  return (
    <section className="space-y-4">
      <PageHeader title="Communications" description="Track outbound messages, notifications, reminders, templates, and recipient history across customers, households, programs, memberships, waivers, and alerts." />

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {dashboardLinks.map(({ key, title, hint, icon: Icon }) => {
          const value =
            key === "sent"
              ? metrics.sentToday
              : key === "scheduled"
                ? metrics.scheduled
                : key === "failed"
                  ? metrics.failed
                  : key === "draft"
                    ? metrics.drafts
                    : key === "waiver"
                      ? metrics.waiverDue
                      : key === "membership"
                        ? metrics.membershipDue
                        : metrics.waitlistDue;
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyDashboardFilter(key)}
              className="rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{title}</p>
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
              <p className="mt-2 text-xs font-medium text-primary">{hint} →</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.95fr_0.95fr]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Search"><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" placeholder="Search subject, body, recipient" /></Field>
              <Field label="Type"><select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="all">All</option><option value="email">Email</option><option value="sms">SMS</option><option value="in_app_notification">In-app</option><option value="system_notification">System notification</option><option value="internal_staff_note">Internal note</option><option value="system_generated">System generated</option></select></Field>
              <Field label="Status"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="all">All</option><option value="sent">Sent</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></Field>
              <Field label="Recipient"><input value={recipientFilter} onChange={(event) => setRecipientFilter(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" placeholder="Customer, household, roster" /></Field>
              <Field label="Source"><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="all">All</option><option value="manual">Manual</option><option value="membership_reminder">Membership reminder</option><option value="waiver_reminder">Waiver reminder</option><option value="registration_confirmation">Registration confirmation</option><option value="waitlist_confirmation">Waitlist confirmation</option><option value="waitlist_promotion">Waitlist promotion</option><option value="program_cancellation">Program cancellation</option><option value="birthday">Birthday</option><option value="payment_reminder">Payment reminder</option><option value="system_alert">System alert</option></select></Field>
              <Field label="Program"><select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="all">All programs</option>{programs.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></Field>
              <Field label="Membership"><select value={membershipFilter} onChange={(event) => setMembershipFilter(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="all">All memberships</option>{memberships.map((entry) => <option key={entry.id} value={entry.id}>{entry.planName}</option>)}</select></Field>
              <Field label="Waiver"><select value={waiverFilter} onChange={(event) => setWaiverFilter(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="all">All waivers</option>{waiverTemplates.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></Field>
              <Field label="From"><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" /></Field>
              <Field label="To"><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" /></Field>
            </div>
          </section>

          <section className="space-y-3">
            {filteredCommunications.map((entry) => {
              const Icon = channelIcon(entry.channel);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedCommunicationId(entry.id)}
                  className={`w-full rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 ${selectedCommunication?.id === entry.id ? "border-primary/50 bg-secondary/20" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <p className="font-semibold">{entry.subject}</p>
                        <Badge tone={entry.status === "failed" ? "danger" : entry.status === "scheduled" ? "warning" : entry.status === "draft" ? "muted" : entry.status === "cancelled" ? "muted" : "success"}>{titleCase(entry.status)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{entry.body ?? entry.message}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{entry.recipientLabel}</span>
                        <span>{titleCase(entry.channel)}</span>
                        <span>{titleCase(entry.source ?? "manual")}</span>
                        <span>{formatDateTime(entry.sentAt ?? entry.scheduledFor ?? entry.createdAt)}</span>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-primary">View →</span>
                  </div>
                </button>
              );
            })}
            {filteredCommunications.length === 0 ? <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">No communications match the current filters.</div> : null}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">Message Detail</h3>
                <p className="text-sm text-muted-foreground">Inspect delivery state, related records, and follow-up actions.</p>
              </div>
              {selectedCommunication ? <Badge tone="muted">{titleCase(selectedCommunication.channel)}</Badge> : null}
            </div>
            {selectedCommunication ? (
              <div className="space-y-3 text-sm">
                <DetailRow label="Subject" value={selectedCommunication.subject} />
                <DetailRow label="Body" value={selectedCommunication.body ?? selectedCommunication.message} multiline />
                <DetailRow label="Status" value={titleCase(selectedCommunication.status)} />
                <DetailRow label="Source" value={titleCase(selectedCommunication.source ?? "manual")} />
                <DetailRow label="Sender" value={selectedCommunication.sender?.name ?? selectedCommunication.createdByStaffName ?? "System"} />
                <DetailRow label="Recipients" value={(selectedCommunication.recipients?.map((entry) => entry.label).join(", ") || selectedCommunication.recipientLabel)} multiline />
                <DetailRow label="Created" value={formatDateTime(selectedCommunication.createdAt)} />
                <DetailRow label="Sent / Scheduled" value={formatDateTime(selectedCommunication.sentAt ?? selectedCommunication.scheduledFor ?? selectedCommunication.createdAt)} />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Related Records</p>
                  {selectedCommunication.relatedRecords?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCommunication.relatedRecords.map((entry) => (
                        <Badge key={`${entry.kind}-${entry.id}`} tone="muted">{entry.label}</Badge>
                      ))}
                    </div>
                  ) : <p className="text-muted-foreground">No related records attached.</p>}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="secondary" onClick={duplicateSelected}><Copy className="mr-2 h-4 w-4" />Duplicate</Button>
                  <Button variant="secondary" onClick={resendSelected}>Resend Placeholder</Button>
                  {selectedCommunication.status === "scheduled" ? <Button variant="secondary" onClick={cancelSelected}>Cancel Scheduled</Button> : null}
                  <Button variant="secondary" onClick={archiveSelected}>Archive</Button>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Select a message to view details.</p>}
          </section>

          <section className="rounded-xl border bg-card p-4">
            <div className="mb-3">
              <h3 className="text-base font-semibold">Automation & Related Work</h3>
              <p className="text-sm text-muted-foreground">Mock scheduled events and operational links that feed message generation.</p>
            </div>
            <div className="space-y-2">
              {visibleAutomations.map((label) => (
                <div key={label} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{label}</p>
                  <p className="text-muted-foreground">Tracked in the communication log and ready for provider-backed delivery later.</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 rounded-lg border bg-secondary/20 p-3 text-sm">
              <p className="font-medium">Connected operations</p>
              <p className="text-muted-foreground">Open alerts: {operationsAlerts.filter((entry) => entry.status === "open").length}</p>
              <div className="flex flex-wrap gap-2">
                <Link className="text-sm font-medium text-primary" href="./alerts">Open alerts →</Link>
                <Link className="text-sm font-medium text-primary" href="./customers?waiver=missing">Customers missing waivers →</Link>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <div className="mb-3">
              <h3 className="text-base font-semibold">Message Composer</h3>
              <p className="text-sm text-muted-foreground">Send manual outreach, schedule reminders, or save drafts with shared templates and searchable recipients.</p>
            </div>
            <PermissionGate permission={composerPermission}>
              <div className="space-y-3">
                <Field label="Template"><select value={selectedTemplateType} onChange={(event) => handleTemplateChange(event.target.value as CommunicationTemplateType)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm">{communicationTemplates.map((entry) => <option key={entry.id} value={entry.type}>{entry.name}</option>)}</select></Field>
                <Field label="Message type"><select value={composerChannel} onChange={(event) => setComposerChannel(event.target.value as CommunicationRecord["channel"])} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="email">Email</option><option value="sms">SMS</option><option value="in_app_notification">In-app notification</option><option value="system_notification">System notification</option><option value="internal_staff_note">Internal note</option></select></Field>
                <Field label="Audience"><select value={composerRecipientType} onChange={(event) => { setComposerRecipientType(event.target.value as CommunicationRecipientType); setSelectedRecipientId(""); }} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm">{availableAudienceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                <Field label="Search recipients">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white pl-9 pr-3 text-sm" placeholder="Search customer, household, roster, membership" />
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-md border">
                      {filteredRecipientOptions.map((entry) => (
                        <button key={entry.id} type="button" aria-label={`Select recipient ${entry.label}`} onClick={() => setSelectedRecipientId(entry.id)} className={`flex w-full items-start justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-secondary/30 ${selectedRecipientId === entry.id ? "bg-secondary/20" : ""}`}>
                          <span>
                            <span className="block font-medium">{entry.label}</span>
                            <span className="block text-muted-foreground">{entry.helper}</span>
                          </span>
                          {selectedRecipientId === entry.id ? <Badge tone="success">Selected</Badge> : null}
                        </button>
                      ))}
                      {filteredRecipientOptions.length === 0 ? <p className="px-3 py-3 text-sm text-muted-foreground">No recipients found.</p> : null}
                    </div>
                  </div>
                </Field>
                {composerRecipientType === "household" && selectedRecipientOption ? (
                  <Field label="Household delivery"><select value={selectedHouseholdDelivery} onChange={(event) => setSelectedHouseholdDelivery(event.target.value as typeof selectedHouseholdDelivery)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="primary_contact">Primary contact</option><option value="all_adults">All adults</option><option value="all_members">All household members</option></select></Field>
                ) : null}
                <Field label="Subject"><input aria-label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" /></Field>
                <Field label="Message"><textarea aria-label="Message" value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-32 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" /></Field>
                <Field label="Attachments"><div className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">Attachments placeholder</div></Field>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => submitCommunication("sent")} disabled={!canSendTransactional && !canManage && !canMessageParticipants}>Send Now</Button>
                  <Button variant="secondary" onClick={() => submitCommunication("scheduled")} disabled={!canSendTransactional && !canManage && !canMessageParticipants}>Schedule</Button>
                  <Button variant="secondary" onClick={() => submitCommunication("draft")}>Save Draft</Button>
                </div>
              </div>
            </PermissionGate>
          </section>
        </div>
      </div>
    </section>
  );
}

function DetailRow({ label, value, multiline = false }: { label: string; value?: string; multiline?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={multiline ? "whitespace-pre-wrap text-sm" : "text-sm"}>{value || "Not available"}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
