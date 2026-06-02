import { HouseholdsWorkspace } from "@/components/households/households-workspace";

export default async function HouseholdDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <HouseholdsWorkspace initialHouseholdId={id} pathname={`/households/${id}`} currentSearch="" />;
}
