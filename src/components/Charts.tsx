"use client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tip = { background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 12, fontSize: 12 };
const axis = { fill: "rgb(var(--muted))", fontSize: 11 };

export function OfferRateChart({ rows, floor }: { rows: { group: string; rate: number }[]; floor: number }) {
  const data = rows.map((r) => ({ group: r.group.replace(" or ", "/").replace("American Indian/Alaska Native", "AI/AN"), rate: Math.round(r.rate * 100) }));
  return (
    <div className="h-72 w-full" role="img" aria-label={`Offer rate by group: ${data.map((d) => `${d.group} ${d.rate}%`).join(", ")}`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 40 }}>
          <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
          <XAxis dataKey="group" tick={axis} interval={0} angle={-25} textAnchor="end" />
          <YAxis tick={axis} unit="%" domain={[0, 100]} />
          <Tooltip contentStyle={tip} formatter={(v: number) => `${v}% of eligible opportunities`} />
          <ReferenceLine y={floor} stroke="rgb(var(--warn))" strokeDasharray="4 4" label={{ value: "4/5 of top rate", fill: "rgb(var(--warn))", fontSize: 10, position: "insideTopRight" }} />
          <Bar isAnimationActive={false} dataKey="rate" fill="rgb(var(--teal))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RetentionChart({ data }: { data: { day: number; proximity: number; bonded: number }[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label={`Simulated retention: ${data.map((d) => `day ${d.day} proximity ${d.proximity}% Bonded ${d.bonded}%`).join("; ")}`}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
          <XAxis dataKey="day" tick={axis} tickFormatter={(d) => `day ${d}`} />
          <YAxis tick={axis} unit="%" domain={[40, 100]} />
          <Tooltip contentStyle={tip} formatter={(v: number) => `${v}% (simulated)`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line isAnimationActive={false} type="monotone" dataKey="proximity" name="Today: nearest available" stroke="rgb(var(--muted))" strokeWidth={2} strokeDasharray="5 4" />
          <Line isAnimationActive={false} type="monotone" dataKey="bonded" name="Bonded" stroke="rgb(var(--coral))" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
