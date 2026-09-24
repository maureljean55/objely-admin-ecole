"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Page";
import { downloadCsv } from "@/lib/csv";
import { fold, formatDateTime } from "@/lib/format";

export default function RestitutionsPage() {
  const { restitutions } = useData();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return restitutions.filter((r) => !q || fold(`${r.ref} ${r.objectRef} ${r.objectName} ${r.prenom} ${r.nom} ${r.classe} ${r.doneBy}`).includes(q)).sort((a, b) => b.doneAt.localeCompare(a.doneAt));
  }, [restitutions, query]);

  return (
    <>
      <PageHeader
        title="Restitutions"
        description="Le registre des objets rendus à leur propriétaire."
        actions={
          <Button
            variant="secondary"
            icon="download"
            onClick={() =>
              downloadCsv(
                "restitutions.csv",
                ["Référence", "Objet", "Nom de l'objet", "Rendu à", "Classe", "Identité vérifiée", "Date", "Par", "Note"],
                rows.map((r) => [r.ref, r.objectRef, r.objectName, `${r.prenom} ${r.nom}`, r.classe, r.idChecked ? "oui" : "non", r.doneAt, r.doneBy, r.note]),
              )
            }
          >
            Exporter
          </Button>
        }
      />
      <Panel>
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
          <p className="text-body text-slate">{rows.length} {rows.length > 1 ? "restitutions" : "restitution"}</p>
          <label className="relative block">
            <span className="sr-only">Rechercher une restitution</span>
            <Icon name="search" size={18} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Objet, nom, référence…" className="h-9 w-[260px] rounded-field border border-line-strong bg-white pl-8 pr-2 text-small outline-none placeholder:text-mute focus:border-blue" />
          </label>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Aucune restitution" text="Quand vous rendez un objet, il est inscrit ici avec la date et la personne qui l'a reçu." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-small text-mute">
                <th className="px-6 py-2.5 font-semibold">Référence</th>
                <th className="px-3 py-2.5 font-semibold">Objet</th>
                <th className="px-3 py-2.5 font-semibold">Rendu à</th>
                <th className="px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Par</th>
                <th className="px-6 py-2.5 font-semibold">Vérification</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-canvas">
                  <td className="px-6 py-3 font-mono text-small text-mute">{r.ref}</td>
                  <td className="px-3 py-3">
                    <Link href={`/objets/${r.objectId}`} className="font-semibold text-ink hover:underline">{r.objectName}</Link>
                    <span className="block font-mono text-small text-mute">{r.objectRef}</span>
                  </td>
                  <td className="px-3 py-3 text-ink">{r.prenom} {r.nom}<span className="block text-small text-mute">{r.classe}</span></td>
                  <td className="px-3 py-3 text-slate">{formatDateTime(r.doneAt)}</td>
                  <td className="px-3 py-3 text-slate">{r.doneBy}</td>
                  <td className="px-6 py-3">{r.idChecked ? <Badge tone="ok"><Icon name="verified" size={14} fill />Identité vérifiée</Badge> : <Badge tone="warn">Non vérifiée</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
