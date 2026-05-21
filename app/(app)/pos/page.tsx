import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PosPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>POS</CardTitle>
        <CardDescription>Point of sale placeholder.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          TODO(stripe): Attach checkout session creation, invoice events, and subscription sync with Stripe.
        </p>
      </CardContent>
    </Card>
  );
}
