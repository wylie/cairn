import { PlatformDashboard } from "@/components/admin/platform-dashboard";
import { getDatabaseStatus } from "@/lib/database-status";

export const dynamic = "force-dynamic";

export default async function PlatformAdminDashboardPage() {
  const databaseStatus = await getDatabaseStatus();

  return <PlatformDashboard databaseStatus={databaseStatus} />;
}
