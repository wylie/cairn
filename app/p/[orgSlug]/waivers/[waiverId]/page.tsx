import type { Metadata } from "next";
import { WaiverSigningForm } from "@/components/public/waiver-signing-form";
import { getOrganizationForPublic } from "@/lib/public-programs";
import { waiverTemplates, waiverTemplateVersions } from "@/lib/mocks/waiver-templates";

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string; waiverId: string }> }): Promise<Metadata> {
  const { orgSlug, waiverId } = await params;
  const org = getOrganizationForPublic(orgSlug);
  const template = waiverTemplates.find((entry) => entry.id === waiverId && (!org || entry.organizationId === org.id));
  return {
    title: `${template?.name ?? "Waiver"} | ${org?.name ?? "Cairn"}`,
    description: `Review and sign ${template?.name ?? "waiver"}.`,
    robots: { index: false, follow: false }
  };
}

export default async function PublicWaiverPage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string; waiverId: string }>;
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { orgSlug, waiverId } = await params;
  const { customerId } = await searchParams;
  const org = getOrganizationForPublic(orgSlug);
  const template = waiverTemplates.find((entry) => entry.id === waiverId && (!org || entry.organizationId === org.id));

  if (!org || !template) return <main className="mx-auto max-w-4xl p-6"><p className="text-sm text-muted-foreground">Waiver not found.</p></main>;

  const version = waiverTemplateVersions.find((entry) => entry.id === template.currentVersionId);
  if (!version) return <main className="mx-auto max-w-4xl p-6"><p className="text-sm text-muted-foreground">Waiver version unavailable.</p></main>;

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <header className="rounded-xl border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{org.name}</p>
        <h1 className="text-2xl font-semibold">{template.name}</h1>
        <p className="text-sm text-muted-foreground">{template.description}</p>
      </header>
      <WaiverSigningForm orgSlug={orgSlug} template={template} version={version} mode="public" defaultCustomerId={customerId} />
    </main>
  );
}
