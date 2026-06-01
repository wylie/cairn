import { redirect } from "next/navigation";

export default async function CustomerPortalRootPage({
  params
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/p/${orgSlug}/dashboard`);
}
