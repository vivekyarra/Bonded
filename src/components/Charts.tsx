"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tip = {
  background: "rgb(var(--surface) / 0.9)",
  border: "1px solid rgb(var(--line) / 0.6)",
  borderRadius: 14,
  fontSize: 12,
  backdropFilter: "blur(12px)",
  boxShadow: "0 10px 30px -12px rgb(0 0 0 / 0.25)",
};
const axis = { fill: "rgb(var(--muted))", fontSize: 11 };
const SHORT: Record<string, string> = {
  "Hispanic or Latino": "Latino",
  "Black or African American": "Black",
  "American Indian or Alaska Native": "AI/AN",
  "Prefer not to say": "N/A",
  "Two or more": "Two+",
};

export function OfferRateChart({ rows, floor }: { rows: { group: string; rate: number; opportunities: number }[]; floor: number }) {
  const data = rows.map((r) => ({ group: SHORT[r.group] ?? r.group, full: r.group, rate: Math.round(r.rate * 100), n: r.opportunities }));
  return (
    <div className="mt-3 h-52 w-full" role="img" aria-label={`Offer rate by group: ${data.map((d) => `${d.full} ${d.rate}%`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 6, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="barg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(var(--teal))" />
              <stop offset="1" stopColor="rgb(var(--violet))" stopOpacity={0.75} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(var(--ink) / 0.06)" vertical={false} />
          <XAxis dataKey="group" tick={axis} interval={0} tickLine={false} axisLine={false} />
          <YAxis tick={axis} unit="%" domain={[0, 100]} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "rgb(var(--ink) / 0.04)" }} contentStyle={tip} formatter={(v: number, _n, p) => [`${v}% of ${p.payload.n} eligible`, p.payload.full]} labelFormatter={() => ""} />
          <ReferenceLine y={floor} stroke="rgb(var(--warn))" strokeDasharray="4 4" />
          <Bar isAnimationActive={false} dataKey="rate" radius={[10, 10, 4, 4]} maxBarSize={44}>
            {data.map((d) => (
              <Cell key={d.full} fill={d.n < 20 ? "rgb(var(--ink) / 0.18)" : "url(#barg)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RetentionChart({ data }: { data: { day: number; proximity: number; bonded: number }[] }) {
  return (
    <div className="h-52 w-full" role="img" aria-label={`Projected retention: ${data.map((d) => `day ${d.day} today ${d.proximity}% Bonded ${d.bonded}%`).join("; ")}`}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="areab" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(var(--coral))" stopOpacity={0.35} />
              <stop offset="1" stopColor="rgb(var(--coral))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(var(--ink) / 0.06)" vertical={false} />
          <XAxis dataKey="day" tick={axis} tickFormatter={(d) => `Day ${d}`} tickLine={false} axisLine={false} />
          <YAxis tick={axis} unit="%" domain={[40, 100]} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tip} formatter={(v: number, n: string) => [`${v}%`, n === "bonded" ? "Bonded" : "Today"]} labelFormatter={(d) => `Day ${d} (projected)`} />
          <Area isAnimationActive={false} type="monotone" dataKey="proximity" stroke="rgb(var(--muted))" strokeDasharray="5 4" strokeWidth={2} fill="transparent" />
          <Area isAnimationActive={false} type="monotone" dataKey="bonded" stroke="rgb(var(--coral))" strokeWidth={3} fill="url(#areab)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
