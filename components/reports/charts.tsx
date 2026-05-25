"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function useChartsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return ready;
}

function ChartViewport({
  height,
  testId,
  children
}: {
  height: number;
  testId: string;
  children: (size: { width: number; height: number }) => React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const update = () => {
      const nextWidth = Math.floor(host.getBoundingClientRect().width);
      setSize({ width: Math.max(0, nextWidth), height });
    };

    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [height]);

  return (
    <div ref={hostRef} className="h-[260px] w-full" data-testid={testId}>
      {size.width > 0 ? children(size) : <div className="h-full w-full rounded-md bg-secondary/30" aria-hidden="true" />}
    </div>
  );
}

export function TrendLineCard({
  title,
  data,
  lines
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  lines: Array<{ key: string; color: string; name: string }>;
}) {
  const chartsReady = useChartsReady();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart text="No trend data available." />
        ) : !chartsReady ? (
          <div className="h-[260px] w-full rounded-md bg-secondary/30" aria-hidden="true" />
        ) : (
          <ChartViewport height={260} testId="trend-line-chart">
            {({ width, height }) => (
              <LineChart width={width} height={height} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                {lines.map((line) => (
                  <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} name={line.name} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            )}
          </ChartViewport>
        )}
      </CardContent>
    </Card>
  );
}

export function BarBreakdownCard({
  title,
  data,
  bars
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  bars: Array<{ key: string; color: string; name: string; stackId?: string }>;
}) {
  const chartsReady = useChartsReady();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyChart text="No bar data available." />
        ) : !chartsReady ? (
          <div className="h-[260px] w-full rounded-md bg-secondary/30" aria-hidden="true" />
        ) : (
          <ChartViewport height={260} testId="bar-breakdown-chart">
            {({ width, height }) => (
              <BarChart width={width} height={height} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                {bars.map((bar) => (
                  <Bar key={bar.key} dataKey={bar.key} fill={bar.color} name={bar.name} stackId={bar.stackId} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            )}
          </ChartViewport>
        )}
      </CardContent>
    </Card>
  );
}
