"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Fields";
import { Icon } from "@/components/ui/Icon";
import { useData } from "@/components/shell/AppShell";
import { readPhoto } from "@/lib/photo";
import { CATEGORIES, type CategoryId } from "@/lib/types";
import type { ObjectInput } from "@/lib/store";

const PLACES = ["CDI", "Cantine", "Gymnase", "Cour", "Salle de cours", "Couloir / Hall", "Salle informatique"];
const STORAGE = ["Casier 1", "Casier 2", "Casier 3", "Coffre", "Étagère sacs", "Étagère vêtements"];

const today = () => new Date().toISOString().slice(0, 10);

export function ObjectForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ObjectInput>;
  submitLabel: string;
  onSubmit: (input: ObjectInput) => void;
  onCancel: () => void;
}) {
  const { objects } = useData();
  const storagePlaces = [...new Set([...STORAGE, ...objects.map((o) => o.storage)])].sort();

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<CategoryId | "">(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [foundAt, setFoundAt] = useState(initial?.foundAt ?? "");
  const [foundOn, setFoundOn] = useState(initial?.foundOn ?? today());
  const [storage, setStorage] = useState(initial?.storage ?? "");
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; category?: string; storage?: string }>({});

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    try {
      setPhoto(await readPhoto(file));
    } catch {
      setPhotoError("Cette image n'a pas pu être lue. Essayez une photo JPEG ou PNG.");
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next = {
      name: name.trim() ? undefined : "Donnez un nom à l'objet.",
      category: category ? undefined : "Choisissez une catégorie.",
      storage: storage.trim() ? undefined : "Indiquez où l'objet est rangé.",
    };
    setErrors(next);
    if (next.name || next.category || next.storage || !category) return;
    onSubmit({
      name: name.trim(),
      category,
      description: description.trim(),
      foundAt: foundAt.trim(),
      foundOn,
      storage: storage.trim(),
      photo,
      fromDeclarationId: initial?.fromDeclarationId,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-[1fr_280px] gap-8">
      <div className="flex flex-col gap-4">
        <TextField label="Nom de l'objet" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} placeholder="Ex : Écouteurs sans fil noirs" />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Catégorie" required value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} error={errors.category}>
            <option value="">Choisir…</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </SelectField>
          <TextField label="Rangé dans" required list="storage-places" value={storage} onChange={(e) => setStorage(e.target.value)} error={errors.storage} placeholder="Ex : Casier 2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Lieu où il a été trouvé" list="found-places" value={foundAt} onChange={(e) => setFoundAt(e.target.value)} placeholder="Ex : Cantine" />
          <TextField label="Trouvé le" type="date" value={foundOn} max={today()} onChange={(e) => setFoundOn(e.target.value)} />
        </div>
        <TextAreaField
          label="Description"
          hint="Couleur, marque, signes distinctifs. Ne notez pas de détail que seul le propriétaire devrait connaître : il sert à vérifier son identité."
          value={description}
          maxLength={250}
          onChange={(e) => setDescription(e.target.value)}
        />
        <datalist id="found-places">{PLACES.map((p) => <option key={p} value={p} />)}</datalist>
        <datalist id="storage-places">{storagePlaces.map((p) => <option key={p} value={p} />)}</datalist>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit">{submitLabel}</Button>
          <Button variant="quiet" onClick={onCancel}>Annuler</Button>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-small font-semibold text-ink">Photo</p>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-card border border-dashed border-line-strong bg-canvas">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Aperçu de l'objet" className="size-full object-contain p-2" />
          ) : (
            <div className="flex flex-col items-center gap-1 px-6 text-center text-small text-mute">
              <Icon name="add_a_photo" size={32} />
              Aucune photo
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-field border border-line-strong bg-white px-3 text-small font-semibold text-ink hover:border-ink">
            <Icon name="upload" size={16} />
            {photo ? "Changer" : "Ajouter une photo"}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => handlePhoto(e.target.files?.[0])} />
          </label>
          {photo && <Button variant="quiet" size="sm" onClick={() => setPhoto(undefined)}>Retirer</Button>}
        </div>
        {photoError && <p role="alert" className="mt-2 text-small font-medium text-danger">{photoError}</p>}
      </div>
    </form>
  );
}
