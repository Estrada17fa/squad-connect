import * as React from "react";
import {
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { assessmentSeries, type AssessmentRow } from "@/hooks/useDevelopment";

const PALETTE = [
  "var(--primary)",
  "var(--status-pending-foreground)",
  "var(--status-approved-foreground)",
  "var(--accent-foreground)",
  "var(--status-rejected-foreground)",
];

/** Evolución de atributos: radar de la última evaluación + líneas históricas. */
export function AssessmentChart({ assessments }: { assessments: AssessmentRow[] }) {
  const { attributes, rows, radar } = React.useMemo(
    () => assessmentSeries(assessments),
    [assessments],
  );

  if (attributes.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin evaluaciones registradas todavía.</p>;
  }

  return (
    <div className="space-y-4">
      {radar.length >= 3 ? (
        <div className="glass p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Última evaluación</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="70%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="attribute"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                <Radar
                  dataKey="score"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {rows.length >= 2 ? (
        <div className="glass p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Evolución</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                {attributes.map((attr, i) => (
                  <Line
                    key={attr}
                    type="monotone"
                    dataKey={attr}
                    stroke={PALETTE[i % PALETTE.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {attributes.map((attr, i) => (
              <span key={attr} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                {attr}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
