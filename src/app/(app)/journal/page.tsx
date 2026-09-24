"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Page";
import { fold, formatDateTime } from "@/lib/format";

const GROUPS: { id: string; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "object", label: "Objets" },
  { id: "declaration", label: "Déclarations" },
  { id: "restitution", label: "Restitutions" },
  { id: "staff", label: "Personnel" },
  { id: "kiosk", label: "Bornes" },
  { id: "settings", label: "Paramètres" },
];

export default function JournalPage() {
  const { log } = useData();
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return log.filter((e) => (group === "all" || e.action.startsWith(`${group}.`)) && (!q || fold(`${e.message} ${e.actor}`).includes(q)));
  }, [log, group, query]);

  return (
    <>
      <PageHeader title="Journal d'activité" description="Qui a fait quoi, et quand. Les 500 dernières actions sont conservées." />
      <Panel>
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={group === g.id}
                onClick={() => setGroup(g.id)}
                className={`h-8 rounded-full px-3 text-small font-semibold ${group === g.id ? "bg-ink text-white" : "bg-canvas text-slate hover:text-ink"}`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <label className="relative block">
            <span className="sr-only">Rechercher dans le journal</span>
            <Icon name="search" size={18} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="h-9 w-[220px] rounded-field border border-line-strong bg-white pl-8 pr-2 text-small outline-none placeholder:text-mute focus:border-blue" />
          </label>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Rien à afficher" text="Aucune action ne correspond à ce filtre." />
        ) : (
          <table className="w-full text-left">
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="w-[170px] whitespace-nowrap px-6 py-3 font-mono text-small tabular-nums text-mute">{formatDateTime(e.at)}</td>
                  <td className="px-3 py-3 text-ink">{e.message}</td>
                  <td className="px-6 py-3 text-right text-small text-slate">{e.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
