"use client";

import { useState } from "react";
import { useCurrentUser, useData } from "@/components/shell/AppShell";
import { useNow } from "@/components/shell/useNow";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Fields";
import { EmptyState, PageHeader, Panel } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, relativeTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createKiosk, deleteKiosk, regeneratePairingCode, setPairingCode, updateKiosk } from "@/lib/store";
import type { Kiosk, PairingCodeRecord } from "@/lib/types";

const ONLINE_WINDOW = 10 * 60_000;

/** "#A7K9Q2": the code is stored without the "#". */
const formatCode = (code?: string) => (code ? `#${code}` : "");

/** The borne's permanent code, with a one-click copy. */
function CodeCell({ code, onEdit }: { code?: string; onEdit?: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!code) return <span className="text-mute">—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="select-all font-mono text-body font-semibold tracking-[0.08em] text-ink">{formatCode(code)}</span>
      <button
        type="button"
        title={copied ? "Copié" : "Copier le code"}
        aria-label={`Copier le code ${formatCode(code)}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(formatCode(code));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard blocked: the code is still selectable on screen.
          }
        }}
        className={`flex size-7 items-center justify-center rounded-field transition-colors ${copied ? "text-ok" : "text-slate hover:bg-black/5 hover:text-ink"}`}
      >
        {copied ? <Icon name="check" size={16} /> : <Icon name="content_copy" size={16} />}
      </button>
      {onEdit && (
        <button type="button" title="Modifier le code" aria-label={`Modifier le code ${formatCode(code)}`} onClick={onEdit} className="flex size-7 items-center justify-center rounded-field text-slate transition-colors hover:bg-black/5 hover:text-ink">
          <Icon name="edit" size={16} />
        </button>
      )}
    </span>
  );
}

function CodeStatus({ code }: { code: PairingCodeRecord }) {
  if (code.replacedAt) return <Badge>Remplacé le {formatDateTime(code.replacedAt)}</Badge>;
  if (code.usedAt) return <Badge tone="ok">Actif · utilisé le {formatDateTime(code.usedAt)}</Badge>;
  return <Badge tone="blue">Actif</Badge>;
}

function KioskStatus({ kiosk, now }: { kiosk: Kiosk; now: number }) {
  if (!kiosk.pairedAt) return <Badge tone="warn">En attente d&apos;appairage</Badge>;
  if (!kiosk.lastSeenAt) return <Badge tone="warn">Jamais vue</Badge>;
  return now - new Date(kiosk.lastSeenAt).getTime() < ONLINE_WINDOW ? <Badge tone="ok">En ligne</Badge> : <Badge tone="danger">Hors ligne</Badge>;
}

export default function BornesPage() {
  const { kiosks, pairingCodes } = useData();
  const now = useNow();
  const user = useCurrentUser();
  const toast = useToast();
  const manage = can(user, "manage_kiosks");
  const [editing, setEditing] = useState<Kiosk | "new" | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Kiosk | null>(null);
  const [codeFor, setCodeFor] = useState<Kiosk | null>(null);
  const [codeDraft, setCodeDraft] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
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
      toast(`Borne ajoutée : code ${formatCode(result.kiosk.pairingCode)}`);
    } else if (editing) {
      const result = await updateKiosk(editing.id, { name: name.trim(), location: location.trim() });
      setBusy(false);
      if (!result.ok) return setError(result.error);
      toast("Borne modifiée");
    }
    setEditing(null);
  }

  function openCode(k: Kiosk) {
    setCodeFor(k);
    setCodeDraft(formatCode(k.pairingCode));
    setCodeError(null);
  }

  // Code typed by the administrator: "#" + 6 letters or digits, any case.
  const normalizeCode = (raw: string) => raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);

  async function saveCode(event: React.FormEvent) {
    event.preventDefault();
    if (!codeFor) return;
    const code = normalizeCode(codeDraft);
    if (code.length !== 6) return setCodeError("Le code doit contenir 6 lettres ou chiffres.");
    setBusy(true);
    const result = await setPairingCode(codeFor.id, code);
    setBusy(false);
    if (!result.ok) return setCodeError(result.error);
    toast(`Code modifié : ${formatCode(result.code)}`);
    setCodeFor(null);
  }

  async function randomCode() {
    if (!codeFor) return;
    setBusy(true);
    const result = await regeneratePairingCode(codeFor.id);
    setBusy(false);
    if (!result.ok) return setCodeError(result.error);
    setCodeDraft(formatCode(result.code));
    toast(`Nouveau code : ${formatCode(result.code)}`);
    setCodeFor(null);
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
        <Panel>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-small text-mute">
                <th className="px-6 py-2.5 font-semibold">Borne</th>
                <th className="px-3 py-2.5 font-semibold">Statut</th>
                <th className="px-3 py-2.5 font-semibold">Code d&apos;appairage</th>
                <th className="px-3 py-2.5 font-semibold">Dernier signal</th>
                <th className="px-3 py-2.5 font-semibold">Version</th>
                {manage && <th className="px-6 py-2.5"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {kiosks.map((k) => (
                <tr key={k.id} className="border-b border-line last:border-0">
                  <td className="px-6 py-3">
                    <p className="font-semibold text-ink">{k.name}</p>
                    <p className="text-small text-slate">{k.location || "Emplacement non précisé"}</p>
                  </td>
                  <td className="px-3 py-3"><KioskStatus kiosk={k} now={now} /></td>
                  <td className="px-3 py-3"><CodeCell code={k.pairingCode} onEdit={manage ? () => openCode(k) : undefined} /></td>
                  <td className="px-3 py-3 text-small text-slate">{k.lastSeenAt ? relativeTime(k.lastSeenAt) : "Jamais"}</td>
                  <td className="px-3 py-3 font-mono text-small text-slate">v{k.version}</td>
                  {manage && (
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1">
                        <IconButton icon="edit" aria-label={`Modifier ${k.name}`} title="Modifier la borne" onClick={() => openForm(k)} />
                        <IconButton icon="delete" tone="danger" aria-label={`Supprimer ${k.name}`} title="Supprimer la borne" onClick={() => setDeleting(k)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      <p className="mt-3 text-small text-mute">
        Le code d&apos;une borne est définitif : il sert à l&apos;appairer, et à l&apos;appairer de nouveau si la tablette est réinitialisée. Modifiez-le si
        vous pensez qu&apos;il a circulé : l&apos;ancien cessera de fonctionner. Une borne est « en ligne » si elle a donné signe de vie dans les 10 dernières minutes.
      </p>

      <section className="mt-8">
        <h2 className="text-h2 text-ink">Historique des codes</h2>
        <p className="mb-3 mt-0.5 text-small text-mute">Tous les codes d&apos;appairage émis, y compris ceux qui ont été remplacés.</p>
        <Panel>
          {pairingCodes.length === 0 ? (
            <EmptyState title="Aucun code pour le moment" text="Chaque fois que vous ajoutez une borne ou modifiez son code, il est enregistré ici." />
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-small text-mute">
                  <th className="px-6 py-2.5 font-semibold">Code</th>
                  <th className="px-3 py-2.5 font-semibold">Borne</th>
                  <th className="px-3 py-2.5 font-semibold">Créé le</th>
                  <th className="px-3 py-2.5 font-semibold">Par</th>
                  <th className="px-6 py-2.5 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {pairingCodes.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-6 py-3 font-mono text-body font-semibold text-ink">{formatCode(c.code)}</td>
                    <td className="px-3 py-3 text-ink">{c.kioskName}</td>
                    <td className="px-3 py-3 text-slate">{formatDateTime(c.createdAt)}</td>
                    <td className="px-3 py-3 text-slate">{c.createdBy ?? "—"}</td>
                    <td className="px-6 py-3"><CodeStatus code={c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>

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

      {codeFor && (
        <Dialog
          title={`Code de ${codeFor.name}`}
          onClose={() => setCodeFor(null)}
          footer={
            <>
              <Button variant="quiet" onClick={() => setCodeFor(null)} disabled={busy}>Annuler</Button>
              <Button type="submit" form="code-form" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
            </>
          }
        >
          <form id="code-form" onSubmit={saveCode} noValidate className="flex flex-col gap-4">
            <TextField
              label="Code d'appairage"
              hint="6 lettres ou chiffres. Le « # » est ajouté tout seul."
              value={codeDraft}
              onChange={(e) => {
                setCodeDraft(`#${normalizeCode(e.target.value)}`);
                setCodeError(null);
              }}
              error={codeError ?? undefined}
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-[18px] tracking-[0.1em]"
            />
            <Button variant="secondary" icon="autorenew" onClick={randomCode} disabled={busy}>Générer un code aléatoire</Button>
            <p className="text-small text-slate">
              L&apos;ancien code cessera de fonctionner. La borne déjà appairée continue de marcher : le nouveau code ne sert qu&apos;à l&apos;appairer.
            </p>
          </form>
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
