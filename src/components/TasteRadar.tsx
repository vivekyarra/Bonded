"use client";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

export function TasteRadar({ data, clientLabel, caregiverLabel }: { data: { domain: string; client: number; caregiver: number }[]; clientLabel: string; caregiverLabel: string }) {
  // Real overlaps are often 5–30%: scale the axis to the data so the shape is readable.
  const peak = Math.max(10, ...data.flatMap((d) => [d.client, d.caregiver]));
  const top = Math.min(100, Math.ceil((peak * 1.15) / 10) * 10);
  return (
    <div>
      <div className="h-60 w-full" role="img" aria-label={`Shared taste by domain: ${data.map((d) => `${d.domain} ${d.client}% / ${d.caregiver}%`).join(", ")}`}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="rgb(var(--ink) / 0.1)" />
            <PolarAngleAxis dataKey="domain" tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, top]} tick={false} axisLine={false} />
            <Radar name={clientLabel} dataKey="client" stroke="rgb(var(--teal))" fill="rgb(var(--teal))" fillOpacity={0.25} strokeWidth={2} />
            <Radar name={caregiverLabel} dataKey="caregiver" stroke="rgb(var(--coral))" fill="rgb(var(--coral))" fillOpacity={0.2} strokeWidth={2} />
            <Tooltip formatter={(v: number) => `${v}% shared`} contentStyle={{ background: "rgb(var(--surface) / 0.9)", border: "1px solid rgb(var(--line) / 0.6)", borderRadius: 14, fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-teal" /> {clientLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-coral" /> {caregiverLabel}
        </span>
        <span>scale 0–{top}%</span>
      </div>
    </div>
  );
}
