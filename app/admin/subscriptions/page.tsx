import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminSubscriptionsPage() {
  return (
    <section className="space-y-4">
      <PageHeader title="Subscriptions" description="Placeholder area for facility billing, plan assignments, and platform invoicing." />
      <Card>
        <CardHeader><CardTitle>Subscription Controls</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Future-ready for platform billing, plan upgrades, usage-based charges, and white-label subscriptions.</p>
          <p>This placeholder intentionally separates platform billing from facility-level POS and membership billing.</p>
        </CardContent>
      </Card>
    </section>
  );
}
