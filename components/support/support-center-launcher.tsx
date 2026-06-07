"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { LifeBuoy, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { data } from "@/lib/data";
import { getRuntimeOrganizationsClient } from "@/lib/platform-admin/registry";
import { useSupportState } from "@/lib/state/support-state";
import { parseOrgSlugFromPathname } from "@/lib/tenant/path";
import { cn } from "@/lib/utils";
import type { SupportRequestCategory, SupportRequestPriority } from "@/types/domain";

const categoryOptions: Array<{ value: SupportRequestCategory; label: string; description: string }> = [
  { value: "bug_report", label: "Bug Report", description: "Something is broken or behaving incorrectly." },
  { value: "feature_request", label: "Feature Request", description: "A workflow gap or enhancement request." },
  { value: "product_feedback", label: "Product Feedback", description: "General input on fit, friction, or usability." },
  { value: "training_request", label: "Training Request", description: "Request onboarding, workflow review, or best-practices help." },
  { value: "general_support", label: "General Support Question", description: "Ask Cairn support for help or clarification." }
];

const priorityOptions: Array<{ value: SupportRequestPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];

function getFacilityName(entry: unknown): string | undefined {
  if (!entry || typeof entry !== "object") return undefined;
  const candidate = entry as { primaryLocationName?: unknown };
  return typeof candidate.primaryLocationName === "string" ? candidate.primaryLocationName : undefined;
}

export function SupportCenterLauncher() {
  const pathname = usePathname() ?? "/";
  const { submitSupportRequest } = useSupportState();
  const organizations = useMemo(
    () => (typeof document !== "undefined" ? getRuntimeOrganizationsClient() : data.organizations),
    []
  );
  const currentOrgSlug = parseOrgSlugFromPathname(pathname);
  const currentOrganization = useMemo(
    () => organizations.find((entry) => entry.slug === currentOrgSlug),
    [organizations, currentOrgSlug]
  );
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<SupportRequestCategory>("general_support");
  const [priority, setPriority] = useState<SupportRequestPriority>("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workflowAffected, setWorkflowAffected] = useState("");
  const [businessImpact, setBusinessImpact] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [estimatedAttendees, setEstimatedAttendees] = useState("6");
  const [topicsRequested, setTopicsRequested] = useState("");
  const [screenshotName, setScreenshotName] = useState("");

  const resetForm = () => {
    setCategory("general_support");
    setPriority("normal");
    setTitle("");
    setDescription("");
    setWorkflowAffected("");
    setBusinessImpact("");
    setRequestedDate("");
    setEstimatedAttendees("6");
    setTopicsRequested("");
    setScreenshotName("");
  };

  const categoryCopy = categoryOptions.find((option) => option.value === category);
  const showFeatureFields = category === "feature_request" || category === "product_feedback";
  const showTrainingFields = category === "training_request";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = submitSupportRequest({
      name,
      email,
      category,
      priority,
      title,
      description,
      workflowAffected,
      businessImpact,
      requestedDate,
      estimatedAttendees: showTrainingFields ? Number.parseInt(estimatedAttendees || "0", 10) || undefined : undefined,
      topicsRequested,
      screenshotName,
      pageUrl: pathname,
      organizationSlug: currentOrganization?.slug,
      organizationName: currentOrganization?.name,
      facilityName: getFacilityName(currentOrganization)
    });
    setMessage(result.message);
    if (!result.ok) return;
    resetForm();
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40">
        <Button
          type="button"
          className="h-12 rounded-full px-5 shadow-lg"
          onClick={() => {
            setOpen(true);
            setMessage(null);
          }}
        >
          <LifeBuoy className="mr-2 h-4 w-4" aria-hidden="true" />
          Need Help?
        </Button>
      </div>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Support Center"
        title="Support Center"
        description="Ask a question, report a bug, request training, or share feedback with Cairn support."
        maxWidthClassName="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 md:grid-cols-2">
            <div>
              <p className="font-semibold">Transparent support workflows</p>
              <p className="mt-1 text-sky-900">Cairn support sessions are always logged. Your organization maintains full visibility into support activity.</p>
            </div>
            <div>
              <p className="font-semibold">Current page context</p>
              <p className="mt-1 text-sky-900">Page: <span className="font-medium">{pathname}</span></p>
              <p className="text-sky-900">Organization: <span className="font-medium">{currentOrganization?.name ?? "Your Cairn instance"}</span></p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Name</span>
                <Input aria-label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Email</span>
                <Input aria-label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Category</span>
                <select
                  aria-label="Category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as SupportRequestCategory)}
                  className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">{categoryCopy?.description}</span>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Priority</span>
                <select
                  aria-label="Priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as SupportRequestPriority)}
                  className="flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">Title</span>
                <Input
                  aria-label="Title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={category === "feature_request" ? "Short feature request summary" : "Short issue or request summary"}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Organization</span>
                <Input aria-label="Organization" value={currentOrganization?.name ?? "Your Cairn instance"} disabled />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">Facility</span>
                <Input aria-label="Facility" value={getFacilityName(currentOrganization) ?? "Current facility context"} disabled />
              </label>
            </div>

            {showFeatureFields ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Workflow affected</span>
                  <Input aria-label="Workflow affected" value={workflowAffected} onChange={(event) => setWorkflowAffected(event.target.value)} placeholder="Check-In, POS, Registrations" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Business impact</span>
                  <Input aria-label="Business impact" value={businessImpact} onChange={(event) => setBusinessImpact(event.target.value)} placeholder="What slows staff down or blocks work?" />
                </label>
              </div>
            ) : null}

            {showTrainingFields ? (
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Requested date</span>
                  <Input aria-label="Requested date" type="date" value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Estimated attendees</span>
                  <Input aria-label="Estimated attendees" type="number" min="1" value={estimatedAttendees} onChange={(event) => setEstimatedAttendees(event.target.value)} />
                </label>
                <label className="space-y-2 text-sm md:col-span-3">
                  <span className="font-medium">Topics requested</span>
                  <Input aria-label="Topics requested" value={topicsRequested} onChange={(event) => setTopicsRequested(event.target.value)} placeholder="Staff onboarding, workflow review, best practices" />
                </label>
              </div>
            ) : null}

            <label className="space-y-2 text-sm">
              <span className="font-medium">Description</span>
              <textarea
                aria-label="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the issue, question, or workflow in enough detail for Cairn support to help quickly."
                className="min-h-32 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Screenshot upload</span>
                <Input
                  aria-label="Screenshot upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setScreenshotName(event.target.files?.[0]?.name ?? "")}
                />
                <span className="text-xs text-muted-foreground">Optional placeholder for future attachment handling.</span>
              </label>
              <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                <p className="font-medium">What happens next</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>Support requests are logged with page context and organization context.</li>
                  <li>Support staff can only enter a facility through an auditable support session.</li>
                  <li>Facility administrators retain visibility into support activity.</li>
                </ul>
              </div>
            </div>

            {message ? (
              <div className={cn("rounded-lg border px-3 py-2 text-sm", message.includes("submitted") ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900") } role="status">
                {message}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                Support requests are reviewed inside the Cairn Support Console.
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Close</Button>
                <Button type="submit">Submit Request</Button>
              </div>
            </div>
          </form>
        </div>
      </ModalShell>
    </>
  );
}
