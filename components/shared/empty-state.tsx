import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <Card className="border-dashed bg-gradient-to-b from-card to-secondary/20">
      <CardHeader className="items-center text-center">
        <div
          aria-hidden="true"
          className="mb-1 flex h-12 w-12 items-center justify-center rounded-full border border-border/80 bg-background text-lg text-muted-foreground shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
        >
          •
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-md">{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent className="flex justify-center">{action}</CardContent> : null}
    </Card>
  );
}
