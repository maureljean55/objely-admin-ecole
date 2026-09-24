"use client";

import { useState } from "react";
import { BASELINE, GRID, INK, INK_2, MUTED, PERDU, TROUVE } from "./colors";
import { ChartHeader, ViewSwitch } from "./ChartFrame";

export type DayCount = { key: string; label: string; long: string; perdu: number; trouve: number; today: boolean };

const W = 640;
const H = 232;
const M = { top: 22, right: 8, bottom: 30, left: 26 };
const GAP = 2; // surface gap between the two stacked segments
const BAR = 22;
const R = 4; // rounded data-end

/** Rect with only the top corners rounded, anchored on the baseline. */
function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

// Stacked columns, one per day: lost (bottom) and found (top). Two series, so a legend; the peak day is labelled.
export function DeclarationsChart({ days }: { days: DayCount[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<number | null>(null);

  const totals = days.map((d) => d.perdu + d.trouve);
  const sum = { perdu: days.reduce((a, d) => a + d.perdu, 0), trouve: days.reduce((a, d) => a + d.trouve, 0) };
  const yMax = Math.max(4, Math.ceil(Math.max(...totals) / 2) * 2);
  const ticks = [0, yMax / 2, yMax];
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const slot = plotW / days.length;
  const y = (v: number) => M.top + plotH - (v / yMax) * plotH;
  const peak = totals.indexOf(Math.max(...totals));

  const active = hover !== null ? days[hover] : null;

  return (
    <div>
      <ChartHeader title="Déclarations des 14 derniers jours" description="Reçues sur les bornes, par jour" right={<ViewSwitch view={view} onChange={setView} />} />

      <ul className="mb-3 flex items-center gap-5 text-small text-ink">
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: PERDU }} />
          Perdus <span className="font-mono font-semibold tabular-nums">{sum.perdu}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm" style={{ background: TROUVE }} />
          Trouvés <span className="font-mono font-semibold tabular-nums">{sum.trouve}</span>
        </li>
      </ul>

      {view === "table" ? (
        <div className="max-h-[232px] overflow-y-auto rounded-field border border-line">
          <table className="w-full text-left text-small">
            <caption className="sr-only">Déclarations reçues par jour, perdus et trouvés</caption>
            <thead className="sticky top-0 bg-canvas text-mute">
              <tr>
                <th className="px-3 py-1.5 font-semibold">Jour</th>
                <th className="px-3 py-1.5 text-right font-semibold">Perdus</th>
                <th className="px-3 py-1.5 text-right font-semibold">Trouvés</th>
                <th className="px-3 py-1.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d) => (
                <tr key={d.key} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink">{d.long}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{d.perdu}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{d.trouve}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold tabular-nums">{d.perdu + d.trouve}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Colonnes des déclarations par jour sur 14 jours : ${sum.perdu} perdus et ${sum.trouve} trouvés au total.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASELINE : GRID} strokeWidth={1} />
                <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={MUTED} fontFamily="var(--font-plex-mono)">{t}</text>
              </g>
            ))}

            {days.map((d, i) => {
              const cx = M.left + slot * i + slot / 2;
              const x = cx - BAR / 2;
              const hPerdu = (d.perdu / yMax) * plotH;
              const hTrouve = (d.trouve / yMax) * plotH;
              const topIsTrouve = d.trouve > 0;
              return (
                <g key={d.key}>
                  {hover === i && <rect x={M.left + slot * i + 2} y={M.top - 6} width={slot - 4} height={plotH + 6} rx={6} fill="#f3f4f8" />}
                  {d.perdu > 0 && (
                    <path
                      d={topIsTrouve ? `M${x},${y(0)} V${y(0) - hPerdu} H${x + BAR} V${y(0)} Z` : topRounded(x, y(0) - hPerdu, BAR, hPerdu, R)}
                      fill={PERDU}
                    />
                  )}
                  {d.trouve > 0 && <path d={topRounded(x, y(0) - hPerdu - hTrouve - (d.perdu > 0 ? GAP : 0), BAR, hTrouve, R)} fill={TROUVE} />}
                  {d.perdu > 0 && d.trouve > 0 && null}
                  {i === peak && totals[i] > 0 && (
                    <text x={cx} y={y(totals[i]) - (d.perdu > 0 && d.trouve > 0 ? GAP : 0) - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill={INK} fontFamily="var(--font-plex-mono)">
                      {totals[i]}
                    </text>
                  )}
                  <text x={cx} y={H - 10} textAnchor="middle" fontSize={11} fill={d.today ? INK : MUTED} fontWeight={d.today ? 700 : 400}>
                    {d.today ? "Auj." : d.label}
                  </text>
                  {/* larger, focusable hit area than the mark itself */}
                  <rect
                    x={M.left + slot * i}
                    y={0}
                    width={slot}
                    height={H - 6}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${d.long} : ${d.perdu} perdu${d.perdu > 1 ? "s" : ""}, ${d.trouve} trouvé${d.trouve > 1 ? "s" : ""}`}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                  />
                </g>
              );
            })}
          </svg>

          {active && hover !== null && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 min-w-[150px] -translate-x-1/2 rounded-field border border-line bg-white px-3 py-2 text-small shadow-pop"
              style={{ left: `${((M.left + slot * hover + slot / 2) / W) * 100}%`, top: 0 }}
            >
              <p className="mb-1 font-semibold text-ink">{active.long}</p>
              <p className="flex items-center justify-between gap-4" style={{ color: INK_2 }}>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: PERDU }} />Perdus</span>
                <span className="font-mono font-semibold tabular-nums text-ink">{active.perdu}</span>
              </p>
              <p className="flex items-center justify-between gap-4" style={{ color: INK_2 }}>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: TROUVE }} />Trouvés</span>
                <span className="font-mono font-semibold tabular-nums text-ink">{active.trouve}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
