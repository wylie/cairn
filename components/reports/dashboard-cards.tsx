"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Line, LineChart } from "recharts";

export function MetricCard({
  title,
  value,
  changeLabel,
  sparkline,
  footer
}: {
  title: string;
  value: string | number;
  changeLabel?: string;
  sparkline?: Array<{ value: number }>;
  footer?: React.ReactNode;
}) {
  const [chartsReady, setChartsReady] = useState(false);
  const sparklineRef = useRef<HTMLDivElement | null>(null);
  const [sparklineWidth, setSparklineWidth] = useState(0);
  useEffect(() => {
    setChartsReady(true);
  }, []);
  useEffect(() => {
    const host = sparklineRef.current;
    if (!host) return;
    const update = () => setSparklineWidth(Math.max(0, Math.floor(host.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [chartsReady]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {changeLabel ? <p className="text-xs text-muted-foreground">{changeLabel}</p> : null}
        {sparkline && sparkline.length > 1 && chartsReady ? (
          <div ref={sparklineRef} className="h-10 w-full" aria-label={`${title} sparkline`}>
            {sparklineWidth > 0 ? (
              <LineChart width={sparklineWidth} height={40} data={sparkline}>
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            ) : (
              <div className="h-full w-full rounded-sm bg-secondary/30" aria-hidden="true" />
            )}
          </div>
        ) : null}
        {footer}
      </CardContent>
    </Card>
  );
}

export function StatusCard({
  title,
  value,
  action
}: {
  title: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  );
}

export function ListCard({
  title,
  items,
  emptyText
}: {
  title: string;
  items: Array<{ id: string; primary: string; secondary?: string }>;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-md bg-secondary/40 px-3 py-2">
                <p className="text-sm font-medium">{item.primary}</p>
                {item.secondary ? <p className="text-xs text-muted-foreground">{item.secondary}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AlertCard({
  title,
  message,
  tone = "warning"
}: {
  title: string;
  message: string;
  tone?: "warning" | "info";
}) {
  return (
    <Card className={cn(tone === "warning" ? "border-amber-200" : "border-blue-200")}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn("text-sm", tone === "warning" ? "text-amber-900" : "text-blue-900")}>{message}</p>
      </CardContent>
    </Card>
  );
}
