"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ObjectThumb } from "@/components/ObjectThumb";
import { ObjectStatusBadge } from "@/components/StatusBadges";
import { useCurrentUser, useData } from "@/components/shell/AppShell";
import { useNow } from "@/components/shell/useNow";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icon";
import { downloadCsv } from "@/lib/csv";
import { daysSince, fold, formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { CATEGORIES, categoryLabel, type CategoryId, type StoredObject } from "@/lib/types";

type Tab = "stock" | "delai" | "donner" | "rendus" | "tous";

export function ObjectsView() {
  const { objects, settings } = useData();
  const user = useCurrentUser();
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("onglet") as Tab) || "stock";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const now = useNow();

  const overdue = (o: StoredObject) => o.status === "en_stock" && daysSince(o.depositedAt, now) > settings.retentionDays;

  const tabs: { id: Tab; label: string; test: (o: StoredObject) => boolean }[] = [
    { id: "stock", label: "En stock", test: (o) => o.status === "en_stock" },
    { id: "delai", label: "Délai dépassé", test: overdue },
    { id: "donner", label: "À donner", test: (o) => o.status === "a_donner" },
    { id: "rendus", label: "Rendus", test: (o) => o.status === "restitue" },
    { id: "tous", label: "Tous", test: () => true },
  ];

  const active = tabs.find((t) => t.id === tab) ?? tabs[0];
  const rows = useMemo(() => {
    const q = fold(query.trim());
    return objects
      .filter((o) => active.test(o) && (category === "all" || o.category === category) && (!q || fold(`${o.name} ${o.ref} ${o.description} ${o.foundAt} ${o.storage}`).includes(q)))
      .sort((a, b) => b.depositedAt.localeCompare(a.depositedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, active.id, category, query, settings.retentionDays]);

  const setTab = (id: Tab) => router.replace(id === "stock" ? "/objets" : `/objets?onglet=${id}`);

  return (
    <>
      <PageHeader
        title="Objets en stock"
        description="Les objets déposés à la vie scolaire, prêts à être rendus."
        actions={
          <>
            <Button
              variant="secondary"
              icon="download"
              onClick={() =>
                downloadCsv(
                  "objets.csv",
                  ["Référence", "Nom", "Catégorie", "Statut", "Trouvé à", "Trouvé le", "Déposé le", "Rangé dans", "Description"],
                  rows.map((o) => [o.ref, o.name, categoryLabel(o.category), o.status, o.foundAt, o.foundOn, o.depositedAt.slice(0, 10), o.storage, o.description]),
                )
              }
            >
              Exporter
            </Button>
            {can(user, "write") && (
              <Link href="/objets/nouveau" className="inline-flex h-10 items-center gap-2 rounded-field bg-blue px-4 font-semibold text-white hover:brightness-110">
                <Icon name="add" size={18} />
                Enregistrer un objet
              </Link>
            )}
          </>
        }
      />

      <Panel>
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 pt-2">
          <div role="tablist" className="flex gap-1">
            {tabs.map((t) => {
              const count = objects.filter(t.test).length;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active.id === t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`-mb-px flex h-11 items-center gap-2 border-b-2 px-3 text-body font-semibold ${active.id === t.id ? "border-blue text-ink" : "border-transparent text-slate hover:text-ink"}`}
                >
                  {t.label}
                  <span className="rounded-full bg-canvas px-2 font-mono text-tag text-slate">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pb-2">
            <select aria-label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value as CategoryId | "all")} className="h-9 rounded-field border border-line-strong bg-white px-2 text-small outline-none focus:border-blue">
              <option value="all">Toutes les catégories</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <label className="relative block">
              <span className="sr-only">Rechercher un objet</span>
              <Icon name="search" size={18} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, référence, lieu…" className="h-9 w-[240px] rounded-field border border-line-strong bg-white pl-8 pr-2 text-small outline-none placeholder:text-mute focus:border-blue" />
            </label>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={query || category !== "all" ? "Aucun objet ne correspond" : "Aucun objet ici"}
            text={query || category !== "all" ? "Essayez un autre mot ou une autre catégorie." : "Les objets de cet onglet apparaîtront ici."}
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-small text-mute">
                <th className="px-6 py-2.5 font-semibold">Objet</th>
                <th className="px-3 py-2.5 font-semibold">Catégorie</th>
                <th className="px-3 py-2.5 font-semibold">Trouvé</th>
                <th className="px-3 py-2.5 font-semibold">Rangé dans</th>
                <th className="px-3 py-2.5 font-semibold">Déposé</th>
                <th className="px-6 py-2.5 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const days = daysSince(o.depositedAt, now);
                return (
                  <tr key={o.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-6 py-3">
                      <Link href={`/objets/${o.id}`} className="flex items-center gap-3">
                        <ObjectThumb photo={o.photo} category={o.category} name={o.name} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{o.name}</span>
                          <span className="font-mono text-small text-mute">{o.ref}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate">{categoryLabel(o.category)}</td>
                    <td className="px-3 py-3 text-slate">{o.foundAt || "—"}</td>
                    <td className="px-3 py-3 text-slate">{o.storage}</td>
                    <td className="px-3 py-3">
                      <span className="block text-ink">{formatDate(o.depositedAt)}</span>
                      <span className={`text-small ${o.status === "en_stock" && days > settings.retentionDays ? "font-semibold text-danger" : "text-mute"}`}>
                        {days === 0 ? "aujourd'hui" : `il y a ${days} j`}
                      </span>
                    </td>
                    <td className="px-6 py-3"><ObjectStatusBadge status={o.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
