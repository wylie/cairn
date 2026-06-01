import { WaiverSigningForm } from "@/components/public/waiver-signing-form";
import { getOrganizationForPublic } from "@/lib/public-programs";
import { getDefaultPublicWaiverTemplate, getWaiverTemplateVersionById } from "@/lib/public-waivers";

export default async function KioskWaiversPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const org = getOrganizationForPublic(orgSlug);
  if (!org) return <main className="p-6"><p className="text-sm text-muted-foreground">Organization not found.</p></main>;

  const template = getDefaultPublicWaiverTemplate(orgSlug);
  const version = template ? getWaiverTemplateVersionById(template.currentVersionId) : undefined;
  if (!template || !version) return <main className="p-6"><p className="text-sm text-muted-foreground">No active waiver template.</p></main>;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8" data-testid="waiver-kiosk-mode">
      <div className="mx-auto mb-4 max-w-3xl rounded-xl border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Waiver Kiosk</p>
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <p className="text-sm text-muted-foreground">Full-screen signing flow for front desk tablets.</p>
      </div>
      <WaiverSigningForm orgSlug={orgSlug} template={template} version={version} mode="kiosk" />
    </main>
  );
}
