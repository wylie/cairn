import { redirect } from "next/navigation";

export default async function CustomerAccountRootPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/p/${orgSlug}/account/dashboard`);
}
