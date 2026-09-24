"use client";

import type { ReactNode } from "react";

/** Segmented "Graphique / Tableau" switch: every chart has a table view so no value is colour-only. */
export function ViewSwitch({ view, onChange }: { view: "chart" | "table"; onChange: (v: "chart" | "table") => void }) {
  return (
    <div role="group" aria-label="Affichage" className="flex shrink-0 rounded-field bg-canvas p-0.5">
      {(["chart", "table"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={`h-7 rounded-[6px] px-3 text-small font-semibold ${view === v ? "bg-white text-ink shadow-panel" : "text-slate hover:text-ink"}`}
        >
          {v === "chart" ? "Graphique" : "Tableau"}
        </button>
      ))}
    </div>
  );
}

export function ChartHeader({ title, description, right }: { title: string; description: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-h2 text-ink">{title}</h2>
        <p className="text-small text-mute">{description}</p>
      </div>
      {right}
    </div>
  );
}
