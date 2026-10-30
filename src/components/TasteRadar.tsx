"use client";
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

export function TasteRadar({ data, clientLabel, caregiverLabel }: { data: { domain: string; client: number; caregiver: number }[]; clientLabel: string; caregiverLabel: string }) {
  return (
    <div className="h-72 w-full" role="img" aria-label={`Share of each person's taste that the other shares, by domain: ${data.map((d) => `${d.domain} ${d.client}% / ${d.caregiver}%`).join(", ")}`}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgb(var(--line))" />
          <PolarAngleAxis dataKey="domain" tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name={clientLabel} dataKey="client" stroke="rgb(var(--teal))" fill="rgb(var(--teal))" fillOpacity={0.25} />
          <Radar name={caregiverLabel} dataKey="caregiver" stroke="rgb(var(--coral))" fill="rgb(var(--coral))" fillOpacity={0.2} />
          <Tooltip formatter={(v: number) => `${v}% shared`} contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
