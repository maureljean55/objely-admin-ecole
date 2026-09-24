"use client";

import { useState } from "react";
import { useCurrentUser, useData } from "@/components/shell/AppShell";
import { useNow } from "@/components/shell/useNow";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Fields";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { relativeTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createKiosk, deleteKiosk, regeneratePairingCode, updateKiosk } from "@/lib/store";
import type { Kiosk } from "@/lib/types";

const ONLINE_WINDOW = 10 * 60_000;

function KioskStatus({ kiosk, now }: { kiosk: Kiosk; now: number }) {
  if (!kiosk.pairedAt) {
    const expired = kiosk.pairingExpiresAt ? new Date(kiosk.pairingExpiresAt).getTime() < now : false;
    return expired ? <Badge tone="danger">Code expiré</Badge> : <Badge tone="warn">En attente d&apos;appairage</Badge>;
  }
  if (!kiosk.lastSeenAt) return <Badge tone="warn">Jamais vue</Badge>;
  return now - new Date(kiosk.lastSeenAt).getTime() < ONLINE_WINDOW ? <Badge tone="ok">En ligne</Badge> : <Badge tone="danger">Hors ligne</Badge>;
}

export default function BornesPage() {
  const { kiosks } = useData();
  const now = useNow();
  const user = useCurrentUser();
  const toast = useToast();
  const manage = can(user, "manage_kiosks");
  const [editing, setEditing] = useState<Kiosk | "new" | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Kiosk | null>(null);
  const [deleting, setDeleting] = useState<Kiosk | null>(null);
  const [busy, setBusy] = useState(false);

  function openForm(target: Kiosk | "new") {
    setEditing(target);
    setName(target === "new" ? "" : target.name);
    setLocation(target === "new" ? "" : target.location);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Donnez un nom à la borne.");
    setBusy(true);
    setError(null);
    if (editing === "new") {
      const result = await createKiosk({ name: name.trim(), location: location.trim() });
      setBusy(false);
      if (!result.ok) return setError(result.error);
      setCreated(result.kiosk);
    } else if (editing) {
      const result = await updateKiosk(editing.id, { name: name.trim(), location: location.trim() });
      setBusy(false);
      if (!result.ok) return setError(result.error);
      toast("Borne modifiée");
    }
    setEditing(null);
  }

  async function newCode(k: Kiosk) {
    setBusy(true);
    const result = await regeneratePairingCode(k.id);
    setBusy(false);
    toast(result.ok ? "Nouveau code généré" : result.error);
  }

  return (
    <>
      <PageHeader
        title="Bornes"
        description="Les tablettes installées dans l'établissement."
        actions={manage && <Button icon="add" onClick={() => openForm("new")}>Ajouter une borne</Button>}
      />

      {kiosks.length === 0 ? (
        <Panel><EmptyState title="Aucune borne" text="Ajoutez la première borne pour qu'élèves et personnel puissent déclarer un objet." /></Panel>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {kiosks.map((k) => (
            <Panel key={k.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-h2 text-ink">{k.name}</h2>
                  <p className="truncate text-small text-slate">{k.location || "Emplacement non précisé"}</p>
                </div>
                <KioskStatus kiosk={k} now={now} />
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3">
                <div><dt className="tag">Dernier signal</dt><dd className="text-small text-ink">{k.lastSeenAt ? relativeTime(k.lastSeenAt) : "Jamais"}</dd></div>
                <div><dt className="tag">Version</dt><dd className="font-mono text-small text-ink">v{k.version}</dd></div>
              </dl>
              {!k.pairedAt && (
                new Date(k.pairingExpiresAt ?? 0).getTime() > now && k.pairingCode ? (
                  <p className="rounded-field bg-warn-tint px-3 py-2 text-small text-warn">Code d&apos;appairage : <span className="font-mono font-semibold tracking-widest">{k.pairingCode}</span></p>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-field bg-danger-tint px-3 py-2 text-small text-danger">
                    <span>Le code d&apos;appairage a expiré.</span>
                    {manage && <Button size="sm" variant="secondary" disabled={busy} onClick={() => newCode(k)}>Nouveau code</Button>}
                  </div>
                )
              )}
              {manage && (
                <div className="-mb-1 flex justify-end gap-1">
                  <IconButton icon="edit" aria-label={`Modifier ${k.name}`} onClick={() => openForm(k)} />
                  <IconButton icon="delete" tone="danger" aria-label={`Supprimer ${k.name}`} onClick={() => setDeleting(k)} />
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
      <p className="mt-4 text-small text-mute">Une borne est « en ligne » si elle a donné signe de vie dans les 10 dernières minutes.</p>

      {editing && (
        <Dialog
          title={editing === "new" ? "Ajouter une borne" : "Modifier la borne"}
          onClose={() => setEditing(null)}
          footer={<><Button variant="quiet" onClick={() => setEditing(null)} disabled={busy}>Annuler</Button><Button type="submit" form="kiosk-form" disabled={busy}>{busy ? "Enregistrement…" : editing === "new" ? "Ajouter" : "Enregistrer"}</Button></>}
        >
          <form id="kiosk-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
            <TextField label="Nom" required value={name} onChange={(e) => setName(e.target.value)} error={error ?? undefined} maxLength={60} placeholder="Ex : Borne du hall" />
            <TextField label="Emplacement" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Ex : Hall, bâtiment A" />
          </form>
        </Dialog>
      )}

      {created && (
        <Dialog title="Borne ajoutée" onClose={() => setCreated(null)} footer={<Button onClick={() => setCreated(null)}>Terminé</Button>}>
          <p className="text-body text-ink">Sur la tablette, ouvrez l&apos;application Objely École et saisissez ce code d&apos;appairage :</p>
          <p className="my-4 rounded-card bg-canvas py-5 text-center font-mono text-[40px] font-semibold tracking-[0.3em] text-ink">{created.pairingCode}</p>
          <p className="text-small text-mute">Ce code est valable 48 heures et ne sert qu&apos;une fois.</p>
        </Dialog>
      )}

      {deleting && (
        <Dialog
          title="Supprimer cette borne ?"
          onClose={() => setDeleting(null)}
          footer={<><Button variant="quiet" onClick={() => setDeleting(null)} disabled={busy}>Annuler</Button><Button variant="danger" disabled={busy} onClick={async () => { setBusy(true); const r = await deleteKiosk(deleting.id); setBusy(false); toast(r.ok ? "Borne supprimée" : r.error); if (r.ok) setDeleting(null); }}>Supprimer</Button></>}
        >
          <p className="text-body text-ink">{deleting.name} ne pourra plus envoyer de déclarations. Les déclarations déjà reçues sont conservées.</p>
        </Dialog>
      )}
    </>
  );
}
