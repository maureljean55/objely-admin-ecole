"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { DONNER, INK, MUTED, RENDU, STOCK } from "./colors";
import { ChartHeader, ViewSwitch } from "./ChartFrame";

export type StatusCounts = { stock: number; donner: number; rendus: number };

const SIZE = 184;
const C = SIZE / 2;
const R = 70;
const STROKE = 22;
const GAP_PX = 2;

const SLICES = [
  { key: "rendus", label: "Rendus", icon: "task_alt", color: RENDU },
  { key: "stock", label: "En stock", icon: "inventory_2", color: STOCK },
  { key: "donner", label: "À donner", icon: "volunteer_activism", color: DONNER },
] as const;

const point = (angle: number, r = R) => [C + r * Math.sin(angle), C - r * Math.cos(angle)] as const;

function arc(from: number, to: number) {
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  return `M${x1},${y1} A${R},${R} 0 ${to - from > Math.PI ? 1 : 0} 1 ${x2},${y2}`;
}

// Donut of where the objects are. "Emphasis" form: the outcome that matters (given back) in colour, the rest in grey.
export function StatusDonut({ counts }: { counts: StatusCounts }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<string | null>(null);

  const total = counts.stock + counts.donner + counts.rendus;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const gap = GAP_PX / R;

  const arcs = SLICES.map((s, i) => {
    const value = counts[s.key];
    const sweep = total ? (value / total) * Math.PI * 2 : 0;
    // where this slice starts = the sum of the slices before it
    const start = total ? (SLICES.slice(0, i).reduce((sum, p) => sum + counts[p.key], 0) / total) * Math.PI * 2 : 0;
    // a full circle can't be drawn as one arc: nudge it just short
    const visible = sweep > 0.001 ? { from: start + gap / 2, to: Math.min(start + sweep - gap / 2, start + Math.PI * 2 - 0.001) } : null;
    return { ...s, value, visible };
  });

  const active = arcs.find((a) => a.key === hover);
  const center = active ?? arcs[0];

  return (
    <div>
      <ChartHeader title="Où en sont les objets ?" description={`${total} ${total > 1 ? "objets enregistrés" : "objet enregistré"}`} right={<ViewSwitch view={view} onChange={setView} />} />

      {view === "table" ? (
        <div className="rounded-field border border-line">
          <table className="w-full text-left text-small">
            <caption className="sr-only">Objets par statut</caption>
            <thead className="bg-canvas text-mute">
              <tr>
                <th className="px-3 py-1.5 font-semibold">Statut</th>
                <th className="px-3 py-1.5 text-right font-semibold">Objets</th>
                <th className="px-3 py-1.5 text-right font-semibold">Part</th>
              </tr>
            </thead>
            <tbody>
              {arcs.map((a) => (
                <tr key={a.key} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink">{a.label}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{a.value}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{pct(a.value)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center gap-4" onMouseLeave={() => setHover(null)}>
          <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={`Répartition des objets : ${counts.rendus} rendus, ${counts.stock} en stock, ${counts.donner} à donner.`}>
              <circle cx={C} cy={C} r={R} fill="none" stroke="#f3f4f8" strokeWidth={STROKE} />
              {arcs.map(
                (a) =>
                  a.visible && (
                    <path
                      key={a.key}
                      d={arc(a.visible.from, a.visible.to)}
                      fill="none"
                      stroke={a.color}
                      strokeWidth={hover === a.key ? STROKE + 4 : STROKE}
                      tabIndex={0}
                      aria-label={`${a.label} : ${a.value} objets, ${pct(a.value)} %`}
                      onMouseEnter={() => setHover(a.key)}
                      onFocus={() => setHover(a.key)}
                      onBlur={() => setHover(null)}
                      style={{ transition: "stroke-width 120ms" }}
                    />
                  ),
              )}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display text-[38px] font-extrabold leading-none" style={{ color: INK }}>{pct(center.value)}<span className="text-h2"> %</span></span>
              <span className="mt-1 text-small font-semibold" style={{ color: MUTED }}>{center.label.toLowerCase()}</span>
            </div>
          </div>

          <ul className="flex min-w-0 flex-1 flex-col gap-2">
            {arcs.map((a) => (
              <li
                key={a.key}
                onMouseEnter={() => setHover(a.key)}
                className={`flex items-center gap-2.5 rounded-field px-2 py-1.5 text-body ${hover === a.key ? "bg-canvas" : ""}`}
              >
                <span className="size-3 shrink-0 rounded-sm" style={{ background: a.color }} />
                <Icon name={a.icon} size={16} className="text-mute" />
                <span className="flex-1 whitespace-nowrap text-ink">{a.label}</span>
                <span className="font-mono font-semibold tabular-nums text-ink">{a.value}</span>
                <span className="w-11 shrink-0 whitespace-nowrap text-right font-mono text-small tabular-nums text-mute">{pct(a.value)} %</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
