import { WaiverSigningForm } from "@/components/public/waiver-signing-form";
import { getServerSession } from "@/lib/auth/session";
import { getOrganizationForPublic } from "@/lib/public-programs";
import { getDefaultPublicWaiverTemplate, getWaiverTemplateVersionById } from "@/lib/public-waivers";

export default async function KioskWaiversPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const org = getOrganizationForPublic(orgSlug);
  const session = await getServerSession();
  if (!org) return <main className="p-6"><p className="text-sm text-muted-foreground">Organization not found.</p></main>;

  const template = getDefaultPublicWaiverTemplate(orgSlug);
  const version = template ? getWaiverTemplateVersionById(template.currentVersionId) : undefined;
  if (!template || !version) return <main className="p-6"><p className="text-sm text-muted-foreground">No active waiver template.</p></main>;
  const kioskMode =
    session?.kind === "staff" && session.organizationSlugs.includes(orgSlug) ? "kiosk" : "public";

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8" data-testid="waiver-kiosk-mode">
      <div className="mx-auto mb-4 max-w-3xl rounded-xl border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Waiver Kiosk</p>
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <p className="text-sm text-muted-foreground">
          {kioskMode === "kiosk"
            ? "Full-screen signing flow for front desk tablets."
            : "Staff authorization is required before kiosk mode can search facility customers."}
        </p>
      </div>
      <WaiverSigningForm orgSlug={orgSlug} template={template} version={version} mode={kioskMode} />
    </main>
  );
}
