import type { Metadata } from "next";
import Link from "next/link";
import { ProgramCatalog } from "@/components/public/program-catalog";
import { getOrganizationForPublic, getPublicPrograms, getPublicSessionsForProgram } from "@/lib/public-programs";

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> }): Promise<Metadata> {
  const { orgSlug } = await params;
  const org = getOrganizationForPublic(orgSlug);
  const orgName = org?.name ?? "Cairn";
  return {
    title: `Programs | ${orgName}`,
    description: `Discover programs and sessions at ${orgName}.`,
    alternates: { canonical: `https://cairn.example.com/p/${orgSlug}/programs` },
    robots: { index: true, follow: true }
  };
}

export default async function PublicProgramsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const org = getOrganizationForPublic(orgSlug);
  if (!org) {
    return <p className="text-sm text-muted-foreground">Organization not found.</p>;
  }

  const programs = getPublicPrograms(orgSlug);
  const cards = programs.map((program) => ({
    program,
    nextSession: getPublicSessionsForProgram(orgSlug, program.id)[0]
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link className="inline-flex h-10 items-center rounded-md border border-input px-3 text-sm font-medium hover:bg-secondary" href={`/p/${orgSlug}/account/dashboard`}>
          Account
        </Link>
      </div>
      <ProgramCatalog orgSlug={orgSlug} cards={cards} />
    </div>
  );
}
