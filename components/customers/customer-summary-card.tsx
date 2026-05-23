import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CustomerSummaryCard({
  title,
  value,
  detail
}: {
  title: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        <p className="text-base font-semibold">{value}</p>
        {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

