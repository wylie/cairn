import { OnlineCheckout } from "@/components/public/online-checkout";

function resolveStep(step?: string) {
  if (!step) return 0;
  const numeric = Number(step);
  if (Number.isFinite(numeric)) return numeric;
  if (step === "participants") return 1;
  if (step === "eligibility") return 2;
  if (step === "waivers") return 3;
  if (step === "review") return 4;
  if (step === "payment") return 5;
  if (step === "confirmation") return 6;
  return 0;
}

export default async function CustomerPortalCheckoutPage({
  params,
  searchParams
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { orgSlug } = await params;
  const { step } = await searchParams;
  return <OnlineCheckout orgSlug={orgSlug} initialStep={resolveStep(step)} />;
}
