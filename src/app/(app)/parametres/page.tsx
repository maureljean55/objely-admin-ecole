"use client";

import { useState } from "react";
import { useCurrentUser, useData } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Fields";
import { PageHeader, Panel } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { PasswordSection } from "@/components/PasswordSection";
import { can } from "@/lib/permissions";
import { resetDemo, saveSettings } from "@/lib/store";
import { SCHOOL_TYPES, type Settings } from "@/lib/types";

export default function ParametresPage() {
  const { settings } = useData();
  const user = useCurrentUser();
  const toast = useToast();
  const allowed = can(user, "manage_settings");
  const [form, setForm] = useState<Settings>(settings);
  const [errors, setErrors] = useState<Partial<Record<keyof Settings, string>>>({});

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((f) => ({ ...f, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!form.schoolName.trim()) next.schoolName = "Le nom est requis.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "L'e-mail n'est pas valide.";
    if (!(form.retentionDays >= 1 && form.retentionDays <= 730)) next.retentionDays = "Entre 1 et 730 jours.";
    if (!(form.idleSeconds >= 20 && form.idleSeconds <= 600)) next.idleSeconds = "Entre 20 et 600 secondes.";
    setErrors(next);
    if (Object.keys(next).length) return;
    saveSettings({ ...form, schoolName: form.schoolName.trim() });
    toast("Paramètres enregistrés");
  }

  return (
    <>
      <PageHeader title="Paramètres" description="Les informations et les règles de votre établissement." />
      <div className="mb-6">
        <PasswordSection />
      </div>
      {!allowed && <p className="mb-4 rounded-field bg-warn-tint px-4 py-3 text-body text-warn">Seuls les administrateurs peuvent modifier les paramètres.</p>}
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <Panel className="p-6">
          <h2 className="mb-4 text-h2 text-ink">Établissement</h2>
          <fieldset disabled={!allowed} className="grid grid-cols-2 gap-4">
            <TextField label="Nom" required value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} error={errors.schoolName} />
            <SelectField label="Type" value={form.schoolType} onChange={(e) => set("schoolType", e.target.value as Settings["schoolType"])}>
              {Object.entries(SCHOOL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </SelectField>
            <TextField label="Adresse" value={form.address} onChange={(e) => set("address", e.target.value)} className="col-span-2" />
            <TextField label="Téléphone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <TextField label="E-mail de la vie scolaire" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
          </fieldset>
        </Panel>

        <Panel className="p-6">
          <h2 className="mb-4 text-h2 text-ink">Règles de conservation</h2>
          <fieldset disabled={!allowed} className="grid grid-cols-2 gap-4">
            <TextField
              label="Durée de conservation (jours)"
              type="number"
              min={1}
              max={730}
              value={form.retentionDays}
              onChange={(e) => set("retentionDays", Number(e.target.value))}
              error={errors.retentionDays}
              hint="Passé ce délai, un objet non réclamé apparaît dans « Délai dépassé » et peut être donné."
            />
          </fieldset>
        </Panel>

        <Panel className="p-6">
          <h2 className="mb-4 text-h2 text-ink">Bornes</h2>
          <fieldset disabled={!allowed} className="grid grid-cols-2 gap-4">
            <TextField label="Numéro d'aide affiché sur la borne" value={form.helpDesk} onChange={(e) => set("helpDesk", e.target.value)} placeholder="Ex : Poste 204" />
            <TextField
              label="Effacement après inactivité (secondes)"
              type="number"
              min={20}
              max={600}
              value={form.idleSeconds}
              onChange={(e) => set("idleSeconds", Number(e.target.value))}
              error={errors.idleSeconds}
              hint="Une borne efface la saisie d'un élève qui s'éloigne sans finir."
            />
          </fieldset>
        </Panel>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!allowed}>Enregistrer les paramètres</Button>
          <Button variant="quiet" disabled={!allowed} onClick={() => { setForm(settings); setErrors({}); }}>Annuler les changements</Button>
        </div>
      </form>

      <Panel className="mt-10 p-6">
        <h2 className="text-h2 text-ink">Données de démonstration</h2>
        <p className="mt-1 text-body text-slate">Cet espace tourne sur des données de démonstration enregistrées dans ce navigateur. Elles seront remplacées par la base de données de l&apos;établissement.</p>
        <Button variant="secondary" icon="restart_alt" className="mt-4" onClick={() => { resetDemo(); toast("Données de démonstration réinitialisées"); }}>
          Réinitialiser les données de démo
        </Button>
      </Panel>
    </>
  );
}
