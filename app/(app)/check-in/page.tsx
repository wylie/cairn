import { CheckInList } from "@/components/checkins/checkin-list";
import { PageHeader } from "@/components/shared/page-header";

export default function CheckInPage() {
  return (
    <section className="space-y-4">
      <PageHeader title="Check-in" description="Scan, search, and process check-in or check-out in one step." />
      <CheckInList />
    </section>
  );
}
