"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, CircleAlert, ClipboardCheck, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCustomerState } from "@/lib/state/customer-state";
import { useWorkstationState } from "@/lib/state/workstation-state";
import { formatDate, formatDateTime } from "@/lib/format/date";
import type { OperationsAlertRecord, OperationsTaskRecord } from "@/types/domain";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function alertDestination(alert: OperationsAlertRecord) {
  if (alert.customerId) return `/customers/${alert.customerId}`;
  if (alert.sessionId) return `/registrations?sessionId=${alert.sessionId}`;
  if (alert.membershipId) return "/memberships";
  if (alert.waiverTemplateId) return "/waivers";
  if (alert.productId) return "/products";
  if (alert.staffUserId) return "/staff";
  if (alert.transactionId) return "/reports?category=sales&range=today";
  return "/alerts";
}

function taskDestination(task: OperationsTaskRecord) {
  if (task.customerId) return `/customers/${task.customerId}`;
  if (task.sessionId) return `/registrations?sessionId=${task.sessionId}`;
  if (task.membershipId) return "/memberships";
  if (task.waiverTemplateId) return "/waivers";
  if (task.productId) return "/products";
  return "/alerts";
}

export default function AlertsPage() {
  const searchParams = useSearchParams();
  const {
    operationsAlerts,
    operationsTasks,
    resolveOperationsAlert,
    archiveOperationsAlert,
    createOperationsTask,
    updateOperationsTask
  } = useCustomerState();
  const { activeStaff } = useWorkstationState();

  const [feedback, setFeedback] = useState("");
  const [severityFilter, setSeverityFilter] = useState(searchParams?.get?.("severity") ?? "all");
  const [typeFilter, setTypeFilter] = useState(searchParams?.get?.("type") ?? "all");
  const [statusFilter, setStatusFilter] = useState(searchParams?.get?.("status") ?? "open");
  const [taskStatusFilter, setTaskStatusFilter] = useState(searchParams?.get?.("taskStatus") ?? "all");

  const filteredAlerts = useMemo(
    () =>
      operationsAlerts.filter((alert) => {
        if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
        if (typeFilter !== "all" && alert.type !== typeFilter) return false;
        if (statusFilter !== "all" && alert.status !== statusFilter) return false;
        return true;
      }),
    [operationsAlerts, severityFilter, statusFilter, typeFilter]
  );

  const filteredTasks = useMemo(
    () =>
      operationsTasks.filter((task) => {
        if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) return false;
        if (searchParams?.get?.("due") === "today") {
          const todayKey = new Date().toISOString().slice(0, 10);
          return task.dueDate === todayKey;
        }
        return true;
      }),
    [operationsTasks, searchParams, taskStatusFilter]
  );

  const metrics = {
    open: operationsAlerts.filter((alert) => alert.status === "open").length,
    critical: operationsAlerts.filter((alert) => alert.status === "open" && alert.severity === "critical").length,
    warning: operationsAlerts.filter((alert) => alert.status === "open" && alert.severity === "warning").length,
    info: operationsAlerts.filter((alert) => alert.status === "open" && alert.severity === "info").length
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title="Operations Alerts"
        description="Track operational issues and staff follow-up tasks from one workspace."
      />

      {feedback ? (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedback}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Open Alerts" value={metrics.open} icon={Bell} />
        <MetricCard title="Critical" value={metrics.critical} icon={ShieldAlert} />
        <MetricCard title="Warning" value={metrics.warning} icon={CircleAlert} />
        <MetricCard title="Info" value={metrics.info} icon={ClipboardCheck} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect label="Severity" value={severityFilter} onChange={setSeverityFilter} options={["all", "critical", "warning", "info"]} />
              <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter} options={["all", "customer", "membership", "waiver", "program", "inventory", "financial", "staff"]} />
              <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={["all", "open", "resolved", "archived"]} />
            </div>
          </section>

          <section className="space-y-3">
            {filteredAlerts.map((alert) => (
              <article key={alert.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">{alert.title}</h3>
                      <Badge tone={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "muted"}>
                        {titleCase(alert.severity)}
                      </Badge>
                      <Badge tone={alert.status === "open" ? "warning" : alert.status === "resolved" ? "success" : "muted"}>
                        {titleCase(alert.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description ?? "No detail provided."}</p>
                    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <p>Type: {titleCase(alert.type)}</p>
                      <p>Created: {formatDate(alert.createdAt)}</p>
                      <p>Created by: {alert.createdByStaffName ?? "System"}</p>
                      <p>Updated: {formatDateTime(alert.archivedAt ?? alert.resolvedAt ?? alert.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={alertDestination(alert)}>
                      <Button variant="secondary">View Record</Button>
                    </Link>
                    {alert.status === "open" ? (
                      <Button
                        variant="secondary"
                        onClick={() => setFeedback(resolveOperationsAlert(alert.id).message)}
                      >
                        Resolve Alert
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      onClick={() => setFeedback(archiveOperationsAlert(alert.id).message)}
                    >
                      Archive
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setFeedback(
                          createOperationsTask({
                            title: `Follow up: ${alert.title}`,
                            description: alert.description,
                            dueDate: new Date().toISOString().slice(0, 10),
                            assignedStaffId: activeStaff?.id,
                            assignedStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined,
                            customerId: alert.customerId,
                            membershipId: alert.membershipId,
                            waiverTemplateId: alert.waiverTemplateId,
                            sessionId: alert.sessionId,
                            productId: alert.productId,
                            createdByStaffId: activeStaff?.id,
                            createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                          }).message
                        )
                      }
                    >
                      Create Task
                    </Button>
                  </div>
                </div>
              </article>
            ))}
            {filteredAlerts.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
                No alerts match the current filters.
              </div>
            ) : null}
          </section>
        </div>

        <section className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold">Staff Tasks</h3>
              <p className="text-sm text-muted-foreground">Assigned follow-up and operational cleanup work.</p>
            </div>
            <Button
              onClick={() =>
                setFeedback(
                  createOperationsTask({
                    title: "Review operations queue",
                    description: "Triage unassigned alerts and update operational follow-up.",
                    dueDate: new Date().toISOString().slice(0, 10),
                    assignedStaffId: activeStaff?.id,
                    assignedStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined,
                    createdByStaffId: activeStaff?.id,
                    createdByStaffName: activeStaff ? `${activeStaff.firstName} ${activeStaff.lastName}` : undefined
                  }).message
                )
              }
            >
              Add Task
            </Button>
          </div>

          <FilterSelect label="Task Status" value={taskStatusFilter} onChange={setTaskStatusFilter} options={["all", "open", "in_progress", "completed", "archived"]} />

          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <article key={task.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    {task.description ? <p className="text-sm text-muted-foreground">{task.description}</p> : null}
                  </div>
                  <Badge tone={task.status === "completed" ? "success" : task.status === "in_progress" ? "warning" : "muted"}>
                    {titleCase(task.status)}
                  </Badge>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <p>Due: {task.dueDate ? formatDate(task.dueDate) : "No due date"}</p>
                  <p>Assigned: {task.assignedStaffName ?? "Unassigned"}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={taskDestination(task)}>
                    <Button variant="secondary">Open Record</Button>
                  </Link>
                  {task.status !== "in_progress" ? (
                    <Button variant="secondary" onClick={() => setFeedback(updateOperationsTask(task.id, { status: "in_progress" }).message)}>
                      Start
                    </Button>
                  ) : null}
                  {task.status !== "completed" ? (
                    <Button variant="secondary" onClick={() => setFeedback(updateOperationsTask(task.id, { status: "completed" }).message)}>
                      Complete
                    </Button>
                  ) : null}
                  {task.status !== "archived" ? (
                    <Button variant="secondary" onClick={() => setFeedback(updateOperationsTask(task.id, { status: "archived" }).message)}>
                      Archive
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
            {filteredTasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks match the current filter.</p> : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon
}: {
  title: string;
  value: number;
  icon: typeof Bell;
}) {
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

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <select
        className="h-11 min-w-[160px] rounded-md border border-input bg-white px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
