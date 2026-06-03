import { OnlineCheckout } from "@/components/public/online-checkout";

export default async function CustomerPortalCheckoutPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return <OnlineCheckout orgSlug={orgSlug} />;
}
