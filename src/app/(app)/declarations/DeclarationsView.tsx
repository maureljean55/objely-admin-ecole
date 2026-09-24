"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ObjectThumb } from "@/components/ObjectThumb";
import { RestitutionDialog } from "@/components/RestitutionDialog";
import { DeclarationStatusBadge, KindBadge } from "@/components/StatusBadges";
import { useCurrentUser, useData } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { fold, formatDateTime, relativeTime } from "@/lib/format";
import { findMatches } from "@/lib/matching";
import { can } from "@/lib/permissions";
import { deleteDeclaration, loadDeclarationPhotos, setDeclarationStatus } from "@/lib/store";
import { categoryLabel, type Declaration, type DeclarationKind, type DeclarationStatus, type StoredObject } from "@/lib/types";

export function DeclarationsView() {
  const { declarations, objects, kiosks } = useData();
  const user = useCurrentUser();
  const toast = useToast();
  const initialStatus = useSearchParams().get("statut") as DeclarationStatus | null;
  const [kind, setKind] = useState<DeclarationKind | "all">("all");
  const [status, setStatus] = useState<DeclarationStatus | "all">(initialStatus ?? "all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [giving, setGiving] = useState<{ object: StoredObject; declaration: Declaration } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState<{ id: string; photos: string[] } | null>(null);

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return declarations
      .filter((d) => (kind === "all" || d.kind === kind) && (status === "all" || d.status === status) && (!q || fold(`${d.ref} ${d.objectName} ${d.prenom} ${d.nom} ${d.classe} ${d.description}`).includes(q)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [declarations, kind, status, query]);

  const open = declarations.find((d) => d.id === openId);
  // Photos sent from the borne are loaded only when a declaration is opened.
  useEffect(() => {
    let cancelled = false;
    if (openId) void loadDeclarationPhotos(openId).then((photos) => !cancelled && setLoadedPhotos({ id: openId, photos }));
    return () => {
      cancelled = true;
    };
  }, [openId]);
  const photos = loadedPhotos?.id === openId ? loadedPhotos.photos : [];

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string, after?: () => void) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    toast(result.ok ? done : result.error);
    if (result.ok) after?.();
  }
  const canWrite = can(user, "write");
  const kioskName = (id: string) => kiosks.find((k) => k.id === id)?.name ?? "Borne supprimée";
  const suggestions = open && open.kind === "perdu" && open.status !== "cloturee" ? findMatches([open], objects).slice(0, 3) : [];
  const linkedObject = open?.objectId ? objects.find((o) => o.id === open.objectId) : undefined;

  const tab = (id: DeclarationKind | "all", label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={kind === id}
      onClick={() => setKind(id)}
      className={`-mb-px flex h-11 items-center gap-2 border-b-2 px-3 text-body font-semibold ${kind === id ? "border-blue text-ink" : "border-transparent text-slate hover:text-ink"}`}
    >
      {label}
      <span className="rounded-full bg-canvas px-2 font-mono text-tag text-slate">{declarations.filter((d) => id === "all" || d.kind === id).length}</span>
    </button>
  );

  return (
    <>
      <PageHeader
        title="Déclarations"
        description="Ce que les élèves et le personnel ont déclaré sur les bornes."
      />

      <Panel>
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 pt-2">
          <div role="tablist" className="flex gap-1">
            {tab("all", "Toutes")}
            {tab("perdu", "Perdus")}
            {tab("trouve", "Trouvés")}
          </div>
          <div className="flex items-center gap-2 pb-2">
            <select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value as DeclarationStatus | "all")} className="h-9 rounded-field border border-line-strong bg-white px-2 text-small outline-none focus:border-blue">
              <option value="all">Tous les statuts</option>
              <option value="ouverte">Ouvertes</option>
              <option value="correspondance">Correspondance</option>
              <option value="cloturee">Clôturées</option>
            </select>
            <label className="relative block">
              <span className="sr-only">Rechercher une déclaration</span>
              <Icon name="search" size={18} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Objet, nom, référence…" className="h-9 w-[240px] rounded-field border border-line-strong bg-white pl-8 pr-2 text-small outline-none placeholder:text-mute focus:border-blue" />
            </label>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="Aucune déclaration" text={query || status !== "all" || kind !== "all" ? "Aucune déclaration ne correspond à ces filtres." : "Les déclarations faites sur les bornes apparaîtront ici."} />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-small text-mute">
                <th className="px-6 py-2.5 font-semibold">Référence</th>
                <th className="px-3 py-2.5 font-semibold">Type</th>
                <th className="px-3 py-2.5 font-semibold">Objet</th>
                <th className="px-3 py-2.5 font-semibold">Déclarant</th>
                <th className="px-3 py-2.5 font-semibold">Reçue</th>
                <th className="px-6 py-2.5 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} tabIndex={0} onClick={() => setOpenId(d.id)} onKeyDown={(e) => e.key === "Enter" && setOpenId(d.id)} className="cursor-pointer border-b border-line last:border-0 hover:bg-canvas">
                  <td className="px-6 py-3 font-mono text-small text-mute">{d.ref}</td>
                  <td className="px-3 py-3"><KindBadge kind={d.kind} /></td>
                  <td className="max-w-[300px] px-3 py-3">
                    <span className="block truncate font-semibold text-ink">{d.objectName}</span>
                    <span className="block truncate text-small text-mute">{categoryLabel(d.category)}{d.location && ` · ${d.location}`}</span>
                  </td>
                  <td className="px-3 py-3 text-slate">{d.prenom} {d.nom}<span className="block text-small text-mute">{d.classe}</span></td>
                  <td className="px-3 py-3 text-slate">{relativeTime(d.createdAt)}</td>
                  <td className="px-6 py-3"><DeclarationStatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {open && (
        <Dialog
          side
          width={560}
          title={`${open.ref} · ${open.kind === "perdu" ? "Objet perdu" : "Objet trouvé"}`}
          onClose={() => { setOpenId(null); setConfirmDelete(false); }}
          footer={
            canWrite ? (
              <>
                {can(user, "delete") && (
                  confirmDelete ? (
                    <>
                      <span className="mr-auto text-small text-slate">Supprimer cette déclaration ?</span>
                      <Button variant="quiet" onClick={() => setConfirmDelete(false)} disabled={busy}>Non</Button>
                      <Button variant="danger" disabled={busy} onClick={() => run(() => deleteDeclaration(open.id), "Déclaration supprimée", () => { setOpenId(null); setConfirmDelete(false); })}>Oui, supprimer</Button>
                    </>
                  ) : (
                    <Button variant="quiet" icon="delete" className="mr-auto !text-danger" onClick={() => setConfirmDelete(true)}>Supprimer</Button>
                  )
                )}
                {!confirmDelete && (open.status === "cloturee" ? (
                  <Button variant="secondary" icon="undo" disabled={busy} onClick={() => run(() => setDeclarationStatus(open.id, "ouverte"), "Déclaration rouverte")}>Rouvrir</Button>
                ) : (
                  <Button variant="secondary" icon="check" disabled={busy} onClick={() => run(() => setDeclarationStatus(open.id, "cloturee"), "Déclaration clôturée")}>Clôturer</Button>
                ))}
              </>
            ) : undefined
          }
        >
          <div className="flex items-center gap-2">
            <KindBadge kind={open.kind} />
            <DeclarationStatusBadge status={open.status} />
            <span className="ml-auto text-small text-mute">{formatDateTime(open.createdAt)}</span>
          </div>

          <h3 className="mt-4 text-h2 text-ink">{open.objectName}</h3>
          <p className="text-body text-slate">{categoryLabel(open.category)}{open.location && ` · ${open.location}`}</p>
          {open.description && <p className="mt-3 text-body text-ink">{open.description}</p>}
          {photos.length > 0 && (
            <div className="mt-4 flex gap-2">
              {photos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`Photo ${i + 1} envoyée depuis la borne`} className="h-24 w-32 rounded-field border border-line object-cover" />
              ))}
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5">
            <div><dt className="tag">Déclarant</dt><dd className="text-body font-semibold text-ink">{open.prenom} {open.nom}</dd></div>
            <div><dt className="tag">Classe ou groupe</dt><dd className="text-body text-ink">{open.classe}</dd></div>
            <div><dt className="tag">Téléphone</dt><dd className="font-mono text-body text-ink">{open.telephone || <span className="font-sans text-mute">Non renseigné</span>}</dd></div>
            <div><dt className="tag">Reçue sur</dt><dd className="text-body text-ink">{kioskName(open.kioskId)}</dd></div>
          </dl>

          {open.kind === "trouve" && (
            <div className="mt-6 rounded-card border border-line bg-canvas p-4">
              {linkedObject ? (
                <>
                  <p className="text-small font-semibold text-ink">Enregistré dans le stock</p>
                  <Link href={`/objets/${linkedObject.id}`} className="mt-1 inline-flex items-center gap-1 font-semibold text-blue hover:underline">
                    {linkedObject.ref} · {linkedObject.name}
                    <Icon name="arrow_forward" size={16} />
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-body text-ink">Cette personne a signalé un objet trouvé. Quand il est déposé à la vie scolaire, enregistrez-le dans le stock.</p>
                  {canWrite && (
                    <Link href={`/objets/nouveau?from=${open.id}`} className="mt-3 inline-flex h-9 items-center gap-2 rounded-field bg-purple px-3 text-small font-semibold text-white hover:brightness-110">
                      <Icon name="inventory_2" size={16} />
                      Enregistrer dans le stock
                    </Link>
                  )}
                </>
              )}
            </div>
          )}

          {open.kind === "perdu" && (
            <div className="mt-6">
              <h3 className="text-h2 text-ink">Objets qui pourraient correspondre</h3>
              {open.status === "cloturee" ? (
                <p className="mt-2 text-body text-slate">{linkedObject ? `Objet rendu ou associé : ${linkedObject.ref} · ${linkedObject.name}.` : "Déclaration clôturée."}</p>
              ) : suggestions.length === 0 ? (
                <p className="mt-2 text-body text-slate">Aucun objet du stock ne ressemble à cette déclaration pour le moment. Elle sera comparée à chaque nouvel objet enregistré.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {suggestions.map((m) => (
                    <li key={m.object.id} className="flex items-center gap-3 rounded-card border border-line p-3">
                      <ObjectThumb photo={m.object.photo} category={m.object.category} name={m.object.name} size={52} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{m.object.name}</p>
                        <p className="truncate text-small text-mute">{m.object.ref} · {m.reasons.join(" · ")}</p>
                      </div>
                      <span className="font-mono text-small font-semibold text-blue">{m.score} %</span>
                      {canWrite && <Button size="sm" onClick={() => setGiving({ object: m.object, declaration: open })}>Rendre</Button>}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-small text-mute">Une suggestion n&apos;est jamais une preuve : demandez toujours à la personne de décrire l&apos;objet.</p>
            </div>
          )}
        </Dialog>
      )}

      {giving && <RestitutionDialog object={giving.object} declaration={giving.declaration} onClose={() => setGiving(null)} />}
    </>
  );
}
