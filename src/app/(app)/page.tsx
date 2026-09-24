"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Page";
import { useCurrentUser, useData } from "@/components/shell/AppShell";
import { useNow } from "@/components/shell/useNow";
import { daysSince, formatDate, plural, relativeTime, formatTime } from "@/lib/format";
import { findMatches } from "@/lib/matching";
import { can } from "@/lib/permissions";
import { DeclarationsChart, type DayCount } from "@/components/charts/DeclarationsChart";
import { StatusDonut } from "@/components/charts/StatusDonut";

const ACTION_ICON: Record<string, string> = {
  "declaration.create": "edit_note",
  "declaration.status": "edit_note",
  "declaration.delete": "delete",
  "object.create": "inventory_2",
  "object.update": "edit",
  "object.status": "inventory_2",
  "object.delete": "delete",
  "restitution.create": "task_alt",
};

export default function DashboardPage() {
  const state = useData();
  const user = useCurrentUser();
  const now = useNow();

  const stats = useMemo(() => {
    const retention = state.settings.retentionDays;
    const inStock = state.objects.filter((o) => o.status === "en_stock");
    const overdue = inStock.filter((o) => daysSince(o.depositedAt, now) > retention);
    const stale = state.declarations.filter((d) => d.status === "ouverte" && now - new Date(d.createdAt).getTime() > 24 * 3_600_000);
    const matches = findMatches(state.declarations, state.objects);
    const ages = { week: 0, month: 0, mid: 0, over: 0 };
    for (const o of inStock) {
      const d = daysSince(o.depositedAt, now);
      if (d <= 7) ages.week++;
      else if (d <= 30) ages.month++;
      else if (d <= retention) ages.mid++;
      else ages.over++;
    }
    const monthAgo = now - 30 * 86_400_000;
    const returned = state.restitutions.filter((r) => new Date(r.doneAt).getTime() > monthAgo);
    const kiosksOnline = state.kiosks.filter((k) => k.lastSeenAt && now - new Date(k.lastSeenAt).getTime() < 10 * 60_000).length;
    // Last 14 days (Paris time), oldest first.
    const dayKey = (t: number) => new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
    const days: DayCount[] = Array.from({ length: 14 }, (_, i) => {
      const t = now - (13 - i) * 86_400_000;
      const key = dayKey(t);
      const list = state.declarations.filter((d) => dayKey(new Date(d.createdAt).getTime()) === key);
      return {
        key,
        label: new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "numeric", timeZone: "Europe/Paris" }),
        long: new Date(t).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }),
        perdu: list.filter((d) => d.kind === "perdu").length,
        trouve: list.filter((d) => d.kind === "trouve").length,
        today: i === 13,
      };
    });
    const statusCounts = {
      stock: state.objects.filter((o) => o.status === "en_stock").length,
      donner: state.objects.filter((o) => o.status === "a_donner").length,
      rendus: state.objects.filter((o) => o.status === "restitue").length,
    };
    return { inStock, overdue, stale, matches, ages, returned, kiosksOnline, retention, days, statusCounts };
  }, [state, now]);

  const todo = [
    { count: stats.matches.length, label: "correspondances possibles à vérifier", href: "/correspondances", icon: "compare_arrows" },
    { count: stats.stale.length, label: "déclarations sans réponse depuis plus de 24 h", href: "/declarations?statut=ouverte", icon: "edit_note" },
    { count: stats.overdue.length, label: `objets gardés depuis plus de ${stats.retention} jours`, href: "/objets?onglet=delai", icon: "schedule" },
  ].filter((t) => t.count > 0);

  const recent = state.log.slice(0, 8);
  const totalStock = stats.inStock.length || 1;
  const segments = [
    { key: "week", label: "Moins de 7 jours", value: stats.ages.week, color: "bg-blue" },
    { key: "month", label: "7 à 30 jours", value: stats.ages.month, color: "bg-[#6f96ea]" },
    { key: "mid", label: `30 jours au délai (${stats.retention} j)`, value: stats.ages.mid, color: "bg-[#f0b429]" },
    { key: "over", label: "Délai dépassé", value: stats.ages.over, color: "bg-danger" },
  ];

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.name.split(" ")[0]}`}
        description={`${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" })} · ${state.settings.schoolName}`}
        actions={
          can(user, "write") && (
            <Link href="/objets/nouveau" className="inline-flex h-10 items-center gap-2 rounded-field bg-blue px-4 font-semibold text-white hover:brightness-110">
              <Icon name="add" size={18} />
              Enregistrer un objet
            </Link>
          )
        }
      />

      <Panel className="mb-6">
        <div className="border-b border-line px-6 py-4">
          <h2 className="text-h2 text-ink">À traiter</h2>
        </div>
        {todo.length === 0 ? (
          <EmptyState title="Rien à traiter" text="Toutes les déclarations ont une réponse et aucun objet ne dépasse le délai de conservation." />
        ) : (
          <ul className="divide-y divide-line">
            {todo.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="flex items-center gap-5 px-6 py-4 transition-colors hover:bg-canvas">
                  <span className="w-12 text-right font-display text-[34px] font-extrabold leading-none text-ink">{t.count}</span>
                  <span className="flex-1 text-body text-ink">{t.label}</span>
                  <Icon name="arrow_forward" size={18} className="text-mute" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="mb-6 grid grid-cols-[1.45fr_1fr] gap-6">
        <Panel className="p-6">
          <DeclarationsChart days={stats.days} />
        </Panel>
        <Panel className="p-6">
          <StatusDonut counts={stats.statusCounts} />
        </Panel>
      </div>

      <div className="grid grid-cols-[1.35fr_1fr] gap-6">
        <Panel>
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-h2 text-ink">Registre du jour</h2>
            <Link href="/journal" className="text-small font-semibold text-blue hover:underline">Tout le journal</Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="Rien pour le moment" text="Les déclarations reçues, les objets enregistrés et les restitutions apparaîtront ici." />
          ) : (
            <ol className="px-6 py-2">
              {recent.map((e) => {
                const same = new Date(e.at).toDateString() === new Date().toDateString();
                return (
                  <li key={e.id} className="flex gap-4 border-b border-line py-3 last:border-0">
                    <span className="w-[84px] shrink-0 pt-0.5 text-right font-mono text-small tabular-nums text-mute">{same ? formatTime(e.at) : relativeTime(e.at, now)}</span>
                    <Icon name={ACTION_ICON[e.action] ?? "info"} size={18} className="mt-0.5 text-slate" />
                    <div className="min-w-0">
                      <p className="text-body text-ink">{e.message}</p>
                      <p className="text-small text-mute">{e.actor}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel className="p-6">
            <h2 className="text-h2 text-ink">Ancienneté du stock</h2>
            <p className="mt-0.5 text-small text-mute">{plural(stats.inStock.length, "objet gardé", "objets gardés")} à la vie scolaire</p>
            {stats.inStock.length === 0 ? (
              <p className="mt-4 text-body text-slate">Le stock est vide.</p>
            ) : (
              <>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-canvas" role="img" aria-label="Répartition du stock par ancienneté">
                  {segments.map((s) => s.value > 0 && <div key={s.key} className={s.color} style={{ width: `${(s.value / totalStock) * 100}%` }} />)}
                </div>
                <ul className="mt-4 flex flex-col gap-2">
                  {segments.map((s) => (
                    <li key={s.key} className="flex items-center gap-2 text-small">
                      <span className={`size-2.5 rounded-sm ${s.color}`} />
                      <span className="flex-1 text-slate">{s.label}</span>
                      <span className="font-mono font-semibold tabular-nums text-ink">{s.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel className="p-6">
            <h2 className="text-h2 text-ink">Ce mois-ci</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="tag">Objets rendus</dt>
                <dd className="font-display text-[30px] font-extrabold leading-tight text-ink">{stats.returned.length}</dd>
              </div>
              <div>
                <dt className="tag">Bornes en ligne</dt>
                <dd className="font-display text-[30px] font-extrabold leading-tight text-ink">
                  {stats.kiosksOnline}
                  <span className="text-h2 text-mute"> / {state.kiosks.length}</span>
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-small text-mute">Dernier objet rendu : {state.restitutions[0] ? formatDate(state.restitutions[0].doneAt) : "aucun pour le moment"}.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
