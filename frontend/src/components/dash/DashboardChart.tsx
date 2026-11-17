import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type ChartDatum = { label: string; value: number };

const chartConfig: ChartConfig = {
  value: { label: "Total", color: "var(--chart-1)" },
};

/**
 * Responsive horizontal bar chart for platform segments.
 * Colours come from the theme's chart-1…chart-5 tokens.
 */
export function PlatformChart({ data }: { data: ChartDatum[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 28, bottom: 8, left: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.45} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={108}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <ChartTooltip
          cursor={{ fill: "var(--secondary)", opacity: 0.35 }}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Bar dataKey="value" name="Total" barSize={16} radius={[8, 8, 8, 8]}>
          {data.map((datum, index) => (
            <Cell key={datum.label} fill={`var(--chart-${(index % 5) + 1})`} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
