"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ObjectThumb } from "@/components/ObjectThumb";
import { RestitutionDialog } from "@/components/RestitutionDialog";
import { useCurrentUser, useData } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Page";
import { relativeTime } from "@/lib/format";
import { findMatches } from "@/lib/matching";
import { can } from "@/lib/permissions";
import type { Declaration, StoredObject } from "@/lib/types";

export default function CorrespondancesPage() {
  const { declarations, objects } = useData();
  const user = useCurrentUser();
  const matches = useMemo(() => findMatches(declarations, objects), [declarations, objects]);
  const [giving, setGiving] = useState<{ object: StoredObject; declaration: Declaration } | null>(null);

  return (
    <>
      <PageHeader
        title="Correspondances"
        description="Objets du stock qui ressemblent à une déclaration de perte. Ce sont des suggestions : c'est vous qui confirmez."
      />

      {matches.length === 0 ? (
        <Panel>
          <EmptyState
            title="Aucune correspondance pour le moment"
            text="Chaque fois qu'un objet est enregistré ou qu'une perte est déclarée, ils sont comparés (catégorie, mots de la description, lieu)."
            action={<Link href="/declarations" className="font-semibold text-blue hover:underline">Voir les déclarations</Link>}
          />
        </Panel>
      ) : (
        <ul className="flex flex-col gap-4">
          {matches.map((m) => (
            <li key={`${m.declaration.id}-${m.object.id}`}>
              <Panel className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-6 p-5">
                <div className="min-w-0">
                  <p className="tag !text-blue">Perdu · {m.declaration.ref}</p>
                  <p className="truncate text-h2 text-ink">{m.declaration.objectName}</p>
                  <p className="truncate text-small text-slate">{m.declaration.prenom} {m.declaration.nom} · {m.declaration.classe}</p>
                  <p className="truncate text-small text-mute">{m.declaration.description || "Sans description"}</p>
                  <p className="mt-1 text-small text-mute">Déclaré {relativeTime(m.declaration.createdAt)}</p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <Icon name="compare_arrows" size={26} className="text-mute" />
                  <span className="font-mono text-body font-semibold text-blue">{m.score} %</span>
                </div>

                <div className="flex min-w-0 items-center gap-3">
                  <ObjectThumb photo={m.object.photo} category={m.object.category} name={m.object.name} size={64} />
                  <div className="min-w-0">
                    <p className="tag !text-purple">En stock · {m.object.ref}</p>
                    <Link href={`/objets/${m.object.id}`} className="block truncate text-h2 text-ink hover:underline">{m.object.name}</Link>
                    <p className="truncate text-small text-slate">Rangé : {m.object.storage}</p>
                    <p className="truncate text-small text-mute">{m.reasons.join(" · ")}</p>
                  </div>
                </div>

                {can(user, "write") && <Button icon="task_alt" onClick={() => setGiving({ object: m.object, declaration: m.declaration })}>Rendre</Button>}
              </Panel>
            </li>
          ))}
        </ul>
      )}
      {giving && <RestitutionDialog object={giving.object} declaration={giving.declaration} onClose={() => setGiving(null)} />}
    </>
  );
}
