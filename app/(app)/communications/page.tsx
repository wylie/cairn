"use client";

import { useMemo, useState } from "react";
import { Mail, MessageSquare, Bell, FileText, Clock3, CircleAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { formatDateTime } from "@/lib/format/date";
import type { CommunicationRecord, CommunicationRecipientType, CommunicationTemplateType } from "@/types/domain";

const templates: Array<{ id: CommunicationTemplateType; label: string; subject: string; message: string }> = [
  { id: "membership_renewal", label: "Membership Renewal", subject: "Membership renewal reminder", message: "Your membership is approaching renewal. Review your account and update anything that has changed." },
  { id: "waiver_reminder", label: "Waiver Reminder", subject: "Waiver reminder", message: "A required waiver is expiring soon. Please review and sign the latest version before your next visit." },
  { id: "registration_confirmation", label: "Registration Confirmation", subject: "Registration confirmation", message: "Your registration has been confirmed. Review session details in your customer portal." },
  { id: "waitlist_promotion", label: "Waitlist Promotion", subject: "A spot is available", message: "A space has opened and you can now confirm your registration." },
  { id: "birthday_greeting", label: "Birthday Greeting", subject: "Happy Birthday from Cairn", message: "Happy birthday. We look forward to seeing you at the facility soon." },
  { id: "general_announcement", label: "General Announcement", subject: "Facility update", message: "We have an operational update to share with you." },
  { id: "custom", label: "Custom", subject: "", message: "" }
];

const savedSegments = [
  { key: "new_members_this_month", label: "New Members This Month" },
  { key: "open_waitlists", label: "Open Waitlists" },
  { key: "expiring_memberships", label: "Expiring Memberships" },
  { key: "missing_waivers", label: "Missing Waivers" }
];

const automatedTriggers = [
  "Membership expiring",
  "Waiver expiring",
  "Program registration",
  "Waitlist promotion",
  "Birthday",
  "Payment failure",
  "Program cancellation"
];

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function channelIcon(channel: CommunicationRecord["channel"]) {
  switch (channel) {
    case "email":
      return Mail;
    case "sms":
      return MessageSquare;
    case "system_notification":
      return Bell;
    default:
      return FileText;
  }
}

export default function CommunicationsPage() {
  const {
    communications,
    customers,
    households,
    sessions,
    programs,
    memberships,
    createCommunication,
    updateCommunication,
    operationsAlerts,
    operationsTasks
  } = useCustomerState();
  const { activeStaff } = useWorkstationState();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [historyChannelFilter, setHistoryChannelFilter] = useState("all");
  const [composerChannel, setComposerChannel] = useState<CommunicationRecord["channel"]>("email");
  const [recipientType, setRecipientType] = useState<CommunicationRecipientType>("customer");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplateType>("custom");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");

  const recipientOptions = useMemo(() => {
    switch (recipientType) {
      case "customer":
        return customers.map((entry) => ({ id: entry.id, label: `${entry.firstName} ${entry.lastName}` }));
      case "household":
        return households.map((entry) => ({ id: entry.id, label: entry.householdName }));
      case "program_participants":
        return programs.map((entry) => ({ id: entry.id, label: entry.title }));
      case "membership_holders":
        return memberships.map((entry) => ({ id: entry.id, label: entry.planName }));
      case "waitlist":
        return sessions.map((entry) => ({ id: entry.id, label: entry.title?.trim() || `${programs.find((program) => program.id === entry.programId)?.title ?? "Session"} waitlist` }));
      case "staff":
        return [{ id: "staff_team", label: "Active Staff Team" }];
      case "saved_segment":
        return savedSegments.map((entry) => ({ id: entry.key, label: entry.label }));
      default:
        return [];
    }
  }, [customers, households, memberships, programs, recipientType, sessions]);

  const filteredCommunications = useMemo(() => {
    const q = query.trim().toLowerCase();
    return communications.filter((entry) => {
      if (statusFilter !== "all" && entry.status !== statusFilter) return false;
      if (historyChannelFilter !== "all" && entry.channel !== historyChannelFilter) return false;
      if (!q) return true;
      return [entry.subject, entry.message, entry.recipientLabel, entry.createdByStaffName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [communications, historyChannelFilter, query, statusFilter]);

  const metrics = {
    sentToday: communications.filter((entry) => entry.status === "sent" && Boolean(entry.sentAt)).length,
    scheduled: communications.filter((entry) => entry.status === "scheduled").length,
    failed: communications.filter((entry) => entry.status === "failed").length,
    drafts: communications.filter((entry) => entry.status === "draft").length,
    unreadNotifications: communications.filter((entry) => entry.channel === "system_notification" && entry.deliveryStatus !== "read").length,
    recentActivity: communications.slice(0, 8).length
  };

  const applyTemplate = (templateId: CommunicationTemplateType) => {
    setSelectedTemplate(templateId);
    const template = templates.find((entry) => entry.id === templateId);
    if (!template) return;
    setSubject(template.subject);
    setMessage(template.message);
  };

  const resolveRecipientFields = () => {
    const selected = recipientOptions.find((entry) => entry.id === selectedTargetId);
    return {
      recipientLabel: selected?.label ?? "Unassigned recipient",
      customerId: recipientType === "customer" ? selectedTargetId : undefined,
      householdId: recipientType === "household" ? selectedTargetId : undefined,
      programId: recipientType === "program_participants" ? selectedTargetId : undefined,
      membershipId: recipientType === "membership_holders" ? selectedTargetId : undefined,
      sessionId: recipientType === "waitlist" ? selectedTargetId : undefined,
      staffUserId: recipientType === "staff" ? selectedTargetId : undefined,
      segmentKey: recipientType === "saved_segment" ? selectedTargetId : undefined
    };
  };

  const submitCommunication = (status: CommunicationRecord["status"]) => {
    const recipient = resolveRecipientFields();
    const result = createCommunication({
      channel: composerChannel,
      status,
      recipientType,
      recipientLabel: recipient.recipientLabel,
      subject,
      message,
      customerId: recipient.customerId,
      householdId: recipient.householdId,
      programId: recipient.programId,
      membershipId: recipient.membershipId,
      sessionId: recipient.sessionId,
      staffUserId: recipient.staffUserId,
      segmentKey: recipient.segmentKey,
      templateType: selectedTemplate,
      createdByStaffId: activeStaff?.id,
      createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : "Staff",
      scheduledFor: status === "scheduled" ? "2026-05-21T13:00:00Z" : undefined,
      deliveryStatus: status === "sent" ? (composerChannel === "system_notification" ? "unread" : "delivered") : "queued"
    });
    setFeedback(result.message);
    if (result.ok && status !== "draft") {
      setSubject("");
      setMessage("");
      setSelectedTemplate("custom");
    }
  };

  return (
    <section className="space-y-4">
      <PageHeader title="Communications" description="Centralized messaging, templates, notifications, and recipient history for facility operations." />

      {feedback ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{feedback}</p> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Sent Today" value={metrics.sentToday} icon={Mail} />
        <MetricCard title="Scheduled" value={metrics.scheduled} icon={Clock3} />
        <MetricCard title="Failed" value={metrics.failed} icon={CircleAlert} />
        <MetricCard title="Drafts" value={metrics.drafts} icon={FileText} />
        <MetricCard title="Unread Notifications" value={metrics.unreadNotifications} icon={Bell} />
        <MetricCard title="Recent Activity" value={metrics.recentActivity} icon={MessageSquare} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              <Field label="Search"><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" placeholder="Search subject, body, recipient" /></Field>
              <Field label="Channel"><select value={historyChannelFilter} onChange={(event) => setHistoryChannelFilter(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="all">All</option><option value="email">Email</option><option value="sms">SMS</option><option value="system_notification">System Notification</option><option value="internal_staff_note">Internal Staff Note</option></select></Field>
              <Field label="Status"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="all">All</option><option value="sent">Sent</option><option value="scheduled">Scheduled</option><option value="failed">Failed</option><option value="draft">Draft</option></select></Field>
              <Field label="Recent Ops"><div className="rounded-md border bg-secondary px-3 py-3 text-sm text-muted-foreground">{operationsAlerts.filter((entry) => entry.status === "open").length} alerts · {operationsTasks.filter((entry) => entry.status !== "completed" && entry.status !== "archived").length} tasks</div></Field>
            </div>
          </section>

          <section className="space-y-3">
            {filteredCommunications.map((entry) => {
              const Icon = channelIcon(entry.channel);
              return (
                <article key={entry.id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <h3 className="text-base font-semibold">{entry.subject}</h3>
                        <Badge tone={entry.status === "failed" ? "danger" : entry.status === "scheduled" ? "warning" : entry.status === "draft" ? "muted" : "success"}>{titleCase(entry.status)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.message}</p>
                      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>Recipient: {entry.recipientLabel}</p>
                        <p>Type: {titleCase(entry.recipientType)}</p>
                        <p>Channel: {titleCase(entry.channel)}</p>
                        <p>{entry.sentAt ? `Sent: ${formatDateTime(entry.sentAt)}` : entry.scheduledFor ? `Scheduled: ${formatDateTime(entry.scheduledFor)}` : `Created: ${formatDateTime(entry.createdAt)}`}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {entry.status === "draft" ? <Button variant="secondary" onClick={() => setFeedback(updateCommunication(entry.id, { status: "sent", sentAt: new Date().toISOString(), deliveryStatus: "delivered" }).message)}>Send Draft</Button> : null}
                      {entry.status !== "draft" ? <Button variant="secondary" onClick={() => setFeedback("Resend placeholder.")}>Resend</Button> : null}
                    </div>
                  </div>
                </article>
              );
            })}
            {filteredCommunications.length === 0 ? <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">No communications match the current filters.</div> : null}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold">Message Composer</h3>
              <p className="text-sm text-muted-foreground">Send, schedule, or save messages for customers, households, programs, memberships, waitlists, staff, and saved segments.</p>
            </div>
            <Field label="Template"><select value={selectedTemplate} onChange={(event) => applyTemplate(event.target.value as CommunicationTemplateType)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm">{templates.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></Field>
            <Field label="Channel"><select value={composerChannel} onChange={(event) => setComposerChannel(event.target.value as CommunicationRecord["channel"])} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="email">Email</option><option value="sms">SMS</option><option value="system_notification">System Notification</option><option value="internal_staff_note">Internal Staff Note</option></select></Field>
            <Field label="To"><select value={recipientType} onChange={(event) => { setRecipientType(event.target.value as CommunicationRecipientType); setSelectedTargetId(""); }} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="customer">Individual Customer</option><option value="household">Household</option><option value="program_participants">Program Participants</option><option value="membership_holders">Membership Holders</option><option value="waitlist">Waitlists</option><option value="staff">Staff</option><option value="saved_segment">Saved Segments</option></select></Field>
            <Field label="Recipient"><select value={selectedTargetId} onChange={(event) => setSelectedTargetId(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="">Select recipient</option>{recipientOptions.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></Field>
            <Field label="Subject"><input value={subject} onChange={(event) => setSubject(event.target.value)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm" /></Field>
            <Field label="Message"><textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-32 w-full rounded-md border border-input bg-white px-3 py-2 text-sm" /></Field>
            <Field label="Attachments"><div className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">Attachments placeholder</div></Field>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => submitCommunication("sent")}>Send</Button>
              <Button variant="secondary" onClick={() => submitCommunication("scheduled")}>Schedule</Button>
              <Button variant="secondary" onClick={() => submitCommunication("draft")}>Save Draft</Button>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold">Automation Triggers</h3>
              <p className="text-sm text-muted-foreground">These events generate or schedule communications automatically inside Cairn.</p>
            </div>
            <div className="space-y-2">
              {automatedTriggers.map((trigger) => (
                <div key={trigger} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{trigger}</p>
                  <p className="text-muted-foreground">Tracked in the communications timeline and ready for future provider integrations.</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Mail }) {
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
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
