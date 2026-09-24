"use client";

import { useState } from "react";
import { useCurrentUser, useData } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, TextField } from "@/components/ui/Fields";
import { PageHeader, Panel } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { initials, relativeTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { createStaff, deleteStaff, updateStaff } from "@/lib/store";
import { ROLES, type StaffMember, type StaffRole } from "@/lib/types";

export default function PersonnelPage() {
  const { staff } = useData();
  const user = useCurrentUser();
  const toast = useToast();
  const manage = can(user, "manage_staff");
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("vie_scolaire");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<StaffMember | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openForm(target: StaffMember | "new") {
    setEditing(target);
    setName(target === "new" ? "" : target.name);
    setEmail(target === "new" ? "" : target.email);
    setRole(target === "new" ? "vie_scolaire" : target.role);
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError("Le nom est requis.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("L'e-mail n'est pas valide.");
    const result =
      editing === "new"
        ? createStaff({ name: name.trim(), email: email.trim().toLowerCase(), role })
        : updateStaff((editing as StaffMember).id, { name: name.trim(), email: email.trim().toLowerCase(), role });
    if (result.error) return setError(result.error);
    toast(editing === "new" ? "Accès créé" : "Accès modifié");
    setEditing(null);
  }

  return (
    <>
      <PageHeader
        title="Personnel"
        description="Les personnes qui ont accès à cet espace."
        actions={manage && <Button icon="person_add" onClick={() => openForm("new")}>Ajouter une personne</Button>}
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        {(Object.entries(ROLES) as [StaffRole, (typeof ROLES)[StaffRole]][]).map(([key, r]) => (
          <Panel key={key} className="p-4">
            <p className="text-body font-semibold text-ink">{r.label}</p>
            <p className="text-small text-slate">{r.description}</p>
          </Panel>
        ))}
      </div>

      <Panel>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-small text-mute">
              <th className="px-6 py-2.5 font-semibold">Nom</th>
              <th className="px-3 py-2.5 font-semibold">Rôle</th>
              <th className="px-3 py-2.5 font-semibold">Statut</th>
              <th className="px-3 py-2.5 font-semibold">Dernière connexion</th>
              <th className="px-6 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {staff.map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0 hover:bg-canvas">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-small font-extrabold text-white">{initials(m.name)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{m.name}{m.id === user.id && <span className="ml-2 text-small font-normal text-mute">(vous)</span>}</span>
                      <span className="block truncate text-small text-mute">{m.email}</span>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3"><Badge tone={m.role === "admin" ? "purple" : m.role === "vie_scolaire" ? "blue" : "neutral"}>{ROLES[m.role].label}</Badge></td>
                <td className="px-3 py-3">{m.active ? <Badge tone="ok">Actif</Badge> : <Badge>Désactivé</Badge>}</td>
                <td className="px-3 py-3 text-slate">{m.lastSeenAt ? relativeTime(m.lastSeenAt) : "Jamais"}</td>
                <td className="px-6 py-3">
                  {manage && (
                    <div className="flex justify-end gap-1">
                      <IconButton icon="edit" aria-label={`Modifier ${m.name}`} onClick={() => openForm(m)} />
                      <IconButton
                        icon={m.active ? "person_off" : "person"}
                        aria-label={m.active ? `Désactiver ${m.name}` : `Réactiver ${m.name}`}
                        onClick={() => {
                          const r = updateStaff(m.id, { active: !m.active });
                          toast(r.error ?? (m.active ? "Accès désactivé" : "Accès réactivé"));
                        }}
                      />
                      <IconButton icon="delete" tone="danger" aria-label={`Supprimer ${m.name}`} onClick={() => { setDeleteError(null); setDeleting(m); }} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {editing && (
        <Dialog
          title={editing === "new" ? "Ajouter une personne" : "Modifier l'accès"}
          onClose={() => setEditing(null)}
          footer={<><Button variant="quiet" onClick={() => setEditing(null)}>Annuler</Button><Button type="submit" form="staff-form">{editing === "new" ? "Créer l'accès" : "Enregistrer"}</Button></>}
        >
          <form id="staff-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
            <TextField label="Nom complet" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            <TextField label="E-mail" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
            <SelectField label="Rôle" value={role} onChange={(e) => setRole(e.target.value as StaffRole)} hint={ROLES[role].description}>
              {(Object.keys(ROLES) as StaffRole[]).map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
            </SelectField>
            {error && <p role="alert" className="text-small font-medium text-danger">{error}</p>}
          </form>
        </Dialog>
      )}

      {deleting && (
        <Dialog
          title="Supprimer cet accès ?"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="quiet" onClick={() => setDeleting(null)}>Annuler</Button>
              <Button variant="danger" onClick={() => { const r = deleteStaff(deleting.id); if (r.error) return setDeleteError(r.error); setDeleting(null); toast("Accès supprimé"); }}>Supprimer</Button>
            </>
          }
        >
          <p className="text-body text-ink">{deleting.name} ne pourra plus se connecter. Ses actions passées restent dans le journal.</p>
          {deleteError && <p role="alert" className="mt-3 text-small font-medium text-danger">{deleteError}</p>}
        </Dialog>
      )}
    </>
  );
}
