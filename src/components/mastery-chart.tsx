import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface MasteryPoint {
  date: string;
  score: number;
}

export function MasteryChart({ data, height = 220 }: { data: MasteryPoint[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No mastery history yet
      </div>
    );
  }
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            stroke="var(--color-muted-foreground)"
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            stroke="var(--color-muted-foreground)"
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-primary)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
