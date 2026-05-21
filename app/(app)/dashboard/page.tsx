import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ActionButtonGroup } from "@/components/shared/action-button-group";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { data } from "@/lib/data";

export default function DashboardPage() {
  const inFacility = data.customers.filter((c) => c.checkInStatus === "in").length;

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" description="Fast front-desk overview for daily operations." />
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Total Customers" value={data.customers.length} />
        <StatCard label="Currently Checked In" value={inFacility} />
        <StatCard label="Programs" value={data.programs.length} />
      </div>
      <ActionButtonGroup>
        <Link href="/customers"><Button>Open Customer Search</Button></Link>
        <Link href="/check-in"><Button variant="outline">Open Check-in Desk</Button></Link>
      </ActionButtonGroup>
    </div>
  );
}
