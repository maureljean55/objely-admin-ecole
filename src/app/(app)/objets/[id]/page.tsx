"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ObjectForm } from "@/components/ObjectForm";
import { ObjectThumb } from "@/components/ObjectThumb";
import { RestitutionDialog } from "@/components/RestitutionDialog";
import { DeclarationStatusBadge, KindBadge, ObjectStatusBadge } from "@/components/StatusBadges";
import { useCurrentUser, useData } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { daysSince, formatDate, formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { deleteObject, getObjectPhotoUrl, markToDonate, updateObject } from "@/lib/store";
import { categoryLabel } from "@/lib/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 border-b border-line py-3 last:border-0">
      <dt className="text-small font-semibold text-mute">{label}</dt>
      <dd className="text-body text-ink">{children}</dd>
    </div>
  );
}

export default function ObjectPage() {
  const { id } = useParams<{ id: string }>();
  const { objects, restitutions, declarations, settings } = useData();
  const user = useCurrentUser();
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [giving, setGiving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null);

  const object = objects.find((o) => o.id === id);
  const photoPath = object?.photoPath;
  useEffect(() => {
    let cancelled = false;
    if (photoPath) void getObjectPhotoUrl(photoPath).then((url) => !cancelled && url && setSigned({ path: photoPath, url }));
    return () => {
      cancelled = true;
    };
  }, [photoPath]);
  // Only ever the photo of the object on screen (never a stale one while the next loads).
  const fullPhoto = signed && signed.path === photoPath ? signed.url : null;
  if (!object) {
    return (
      <Panel>
        <EmptyState title="Objet introuvable" text="Cet objet n'existe plus, il a peut-être été supprimé." action={<Link href="/objets" className="font-semibold text-blue hover:underline">Retour aux objets</Link>} />
      </Panel>
    );
  }

  const restitution = restitutions.find((r) => r.id === object.restitutionId);
  const linked = declarations.filter((d) => d.objectId === object.id || d.id === object.fromDeclarationId);
  const days = daysSince(object.depositedAt);
  const canWrite = can(user, "write");

  if (editing) {
    return (
      <>
        <PageHeader title={`Modifier ${object.ref}`} description={object.name} />
        <Panel className="p-8">
          <ObjectForm
            initial={{ ...object, photoUrl: fullPhoto ?? object.photo }}
            submitLabel="Enregistrer les modifications"
            onCancel={() => setEditing(false)}
            onSubmit={async (input) => {
              const result = await updateObject(object.id, input);
              if (!result.ok) return result.error;
              setEditing(false);
              toast("Objet modifié");
              return null;
            }}
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      <Link href="/objets" className="mb-3 inline-flex items-center gap-1 text-small font-semibold text-slate hover:text-ink">
        <Icon name="arrow_back" size={16} />
        Objets en stock
      </Link>
      <PageHeader
        title={object.name}
        description={
          <span className="inline-flex items-center gap-3">
            <span className="font-mono text-small">{object.ref}</span>
            <ObjectStatusBadge status={object.status} />
          </span>
        }
        actions={
          canWrite && (
            <>
              {object.status !== "restitue" && (
                <Button icon="task_alt" onClick={() => setGiving(true)}>Rendre l&apos;objet</Button>
              )}
              <Button variant="secondary" icon="edit" onClick={() => setEditing(true)}>Modifier</Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-[340px_1fr] gap-6">
        <Panel className="flex aspect-square items-center justify-center self-start overflow-hidden">
          {fullPhoto ?? object.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fullPhoto ?? object.photo} alt={object.name} className="size-full object-contain p-4" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-mute">
              <ObjectThumb category={object.category} name={object.name} size={96} />
              <span className="text-small">Pas de photo</span>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel className="px-6 py-2">
            <dl>
              <Row label="Description">{object.description || <span className="text-mute">Aucune description</span>}</Row>
              <Row label="Catégorie">{categoryLabel(object.category)}</Row>
              <Row label="Trouvé">{object.foundAt || "Lieu inconnu"}, le {formatDate(object.foundOn)}</Row>
              <Row label="Déposé à la vie scolaire">
                {formatDateTime(object.depositedAt)}{" "}
                <span className={object.status === "en_stock" && days > settings.retentionDays ? "font-semibold text-danger" : "text-mute"}>
                  ({days === 0 ? "aujourd'hui" : `il y a ${days} j`}
                  {object.status === "en_stock" && days > settings.retentionDays ? ", délai dépassé" : ""})
                </span>
              </Row>
              <Row label="Rangé dans">{object.storage}</Row>
            </dl>
          </Panel>

          {restitution && (
            <Panel className="border-ok/40 bg-ok-tint/40 p-6">
              <h2 className="flex items-center gap-2 text-h2 text-ok">
                <Icon name="task_alt" fill />
                Rendu le {formatDate(restitution.doneAt)}
              </h2>
              <p className="mt-2 text-body text-ink">
                À {restitution.prenom} {restitution.nom} ({restitution.classe}) par {restitution.doneBy}.
                {restitution.idChecked && " Identité et description vérifiées."}
              </p>
              {restitution.note && <p className="mt-1 text-body text-slate">« {restitution.note} »</p>}
            </Panel>
          )}

          {linked.length > 0 && (
            <Panel>
              <div className="border-b border-line px-6 py-4">
                <h2 className="text-h2 text-ink">Déclarations liées</h2>
              </div>
              <ul className="divide-y divide-line">
                {linked.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-6 py-3">
                    <KindBadge kind={d.kind} />
                    <span className="font-mono text-small text-mute">{d.ref}</span>
                    <span className="flex-1 truncate text-body text-ink">{d.prenom} {d.nom} · {d.classe}</span>
                    <DeclarationStatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {canWrite && object.status !== "restitue" && (
            <Panel className="flex flex-wrap items-center gap-2 p-4">
              {object.status === "en_stock" ? (
                <Button variant="secondary" icon="volunteer_activism" disabled={busy} onClick={async () => { setBusy(true); const r = await markToDonate(object.id, true); setBusy(false); toast(r.ok ? "Objet marqué à donner" : r.error); }}>
                  Marquer à donner
                </Button>
              ) : (
                <Button variant="secondary" icon="undo" disabled={busy} onClick={async () => { setBusy(true); const r = await markToDonate(object.id, false); setBusy(false); toast(r.ok ? "Objet remis en stock" : r.error); }}>
                  Remettre en stock
                </Button>
              )}
              {can(user, "delete") && (
                <Button variant="quiet" icon="delete" className="ml-auto !text-danger" onClick={() => setConfirmDelete(true)}>
                  Supprimer
                </Button>
              )}
            </Panel>
          )}
        </div>
      </div>

      {giving && <RestitutionDialog object={object} onClose={() => setGiving(false)} />}
      {confirmDelete && (
        <Dialog
          title="Supprimer cet objet ?"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <Button variant="quiet" onClick={() => setConfirmDelete(false)} disabled={busy}>Annuler</Button>
              <Button
                variant="danger"
                icon="delete"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const result = await deleteObject(object.id);
                  setBusy(false);
                  if (!result.ok) return toast(result.error);
                  toast("Objet supprimé");
                  router.push("/objets");
                }}
              >
                {busy ? "Suppression…" : "Supprimer définitivement"}
              </Button>
            </>
          }
        >
          <p className="text-body text-ink">
            {object.ref} · {object.name} sera retiré du stock. Cette action est enregistrée dans le journal et ne peut pas être annulée.
          </p>
        </Dialog>
      )}
    </>
  );
}
