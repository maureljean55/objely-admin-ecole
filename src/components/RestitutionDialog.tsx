"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextAreaField, TextField } from "@/components/ui/Fields";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { ObjectThumb } from "@/components/ObjectThumb";
import { createRestitution } from "@/lib/store";
import type { Declaration, StoredObject } from "@/lib/types";

// Handing an object back: who receives it, and that their identity and description were checked.
export function RestitutionDialog({ object, declaration, onClose }: { object: StoredObject; declaration?: Declaration; onClose: () => void }) {
  const toast = useToast();
  const [prenom, setPrenom] = useState(declaration?.prenom ?? "");
  const [nom, setNom] = useState(declaration?.nom ?? "");
  const [classe, setClasse] = useState(declaration?.classe ?? "");
  const [idChecked, setIdChecked] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ prenom?: string; nom?: string; classe?: string; idChecked?: string }>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const next = {
      prenom: prenom.trim() ? undefined : "Requis",
      nom: nom.trim() ? undefined : "Requis",
      classe: classe.trim() ? undefined : "Requis",
      idChecked: idChecked ? undefined : "Confirmez la vérification avant de rendre l'objet.",
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setBusy(true);
    const result = await createRestitution({ objectId: object.id, prenom: prenom.trim(), nom: nom.trim(), classe: classe.trim(), idChecked, note: note.trim(), declarationId: declaration?.id });
    setBusy(false);
    if (!result.ok) return setFormError(result.error);
    toast(`${object.name} rendu à ${prenom.trim()} ${nom.trim()}`);
    onClose();
  }

  return (
    <Dialog
      title="Rendre l'objet"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={busy}>Annuler</Button>
          <Button type="submit" form="restitution-form" icon="task_alt" disabled={busy}>{busy ? "Enregistrement…" : "Confirmer la restitution"}</Button>
        </>
      }
    >
      <div className="mb-5 flex items-center gap-3 rounded-field bg-canvas p-3">
        <ObjectThumb photo={object.photo} category={object.category} name={object.name} />
        <div className="min-w-0">
          <p className="tag">{object.ref}</p>
          <p className="truncate text-body font-semibold text-ink">{object.name}</p>
        </div>
      </div>

      <form id="restitution-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Prénom" required value={prenom} onChange={(e) => setPrenom(e.target.value)} error={errors.prenom} />
          <TextField label="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} error={errors.nom} />
        </div>
        <TextField label="Classe ou groupe" required value={classe} onChange={(e) => setClasse(e.target.value)} error={errors.classe} placeholder="Ex : Terminale C" />
        <div>
          <Checkbox label="J'ai vérifié son identité et sa description de l'objet" hint="Une pièce d'identité ou une carte d'élève, et au moins un détail que seul le propriétaire connaît." checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} />
          {errors.idChecked && <p role="alert" className="mt-1.5 text-small font-medium text-danger">{errors.idChecked}</p>}
        </div>
        {formError && <p role="alert" className="rounded-field bg-danger-tint px-3 py-2.5 text-small font-medium text-danger">{formError}</p>}
        <TextAreaField label="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={250} className="!min-h-[64px]" />
      </form>
    </Dialog>
  );
}
