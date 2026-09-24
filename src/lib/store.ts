"use client";

import { useSyncExternalStore } from "react";
import { createSeed } from "./seed";
import type {
  CategoryId,
  Declaration,
  DeclarationStatus,
  Kiosk,
  LogEntry,
  Restitution,
  Settings,
  StaffMember,
  StaffRole,
  State,
  StoredObject,
} from "./types";

// DEMO STORE. There is no backend yet: everything lives in this browser's localStorage.
// Every write goes through the actions below, so swapping in Supabase later means replacing
// these functions (and `load`/`persist`), not touching the pages.

const KEY = "objely-ecole-admin:v1";

let state: State | null = null;
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota or blocked storage: the session still works in memory.
  }
}

/** Reads the saved demo state (or seeds one). Call once on the client. */
export function loadStore() {
  if (state) return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw) as State;
  } catch {
    state = null;
  }
  state ??= createSeed();
  emit();
}

export function resetDemo() {
  state = createSeed();
  persist();
  emit();
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(update: (s: State) => Partial<State>, log?: { action: string; message: string; actor?: string }) {
  if (!state) return;
  const current = state;
  const actor = log?.actor ?? current.staff.find((s) => s.id === current.currentUserId)?.name ?? "Système";
  const entry: LogEntry[] = log ? [{ id: crypto.randomUUID(), at: new Date().toISOString(), actor, action: log.action, message: log.message }] : [];
  state = { ...current, ...update(current), log: [...entry, ...current.log].slice(0, 500) };
  persist();
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** null until the client has loaded the store; the app shell renders a skeleton meanwhile. */
export function useStoreState(): State | null {
  return useSyncExternalStore(subscribe, () => state, () => null);
}

const pad = (n: number, width: number) => String(n).padStart(width, "0");
const nextRef = (s: State, kind: keyof State["counters"]) => {
  const n = s.counters[kind];
  return { n, ref: kind === "object" ? `OBJ-${n}` : kind === "declaration" ? `DEC-${n}` : `RST-${pad(n, 4)}` };
};

// ---------------------------------------------------------------- objects

export type ObjectInput = {
  name: string;
  category: CategoryId;
  description: string;
  foundAt: string;
  foundOn: string;
  storage: string;
  photo?: string;
  fromDeclarationId?: string;
};

export function createObject(input: ObjectInput): string {
  const id = crypto.randomUUID();
  commit(
    (s) => {
      const { n, ref } = nextRef(s, "object");
      const object: StoredObject = { id, ref, status: "en_stock", depositedAt: new Date().toISOString(), ...input };
      const declarations = input.fromDeclarationId
        ? s.declarations.map((d) => (d.id === input.fromDeclarationId ? { ...d, status: "cloturee" as const, objectId: id } : d))
        : s.declarations;
      return { objects: [object, ...s.objects], declarations, counters: { ...s.counters, object: n + 1 } };
    },
    { action: "object.create", message: `Objet enregistré : ${input.name}` },
  );
  return id;
}

export function updateObject(id: string, patch: Partial<ObjectInput>) {
  commit(
    (s) => ({ objects: s.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) }),
    { action: "object.update", message: `Objet modifié : ${state?.objects.find((o) => o.id === id)?.ref ?? id}` },
  );
}

export function deleteObject(id: string) {
  const target = state?.objects.find((o) => o.id === id);
  commit(
    (s) => ({ objects: s.objects.filter((o) => o.id !== id) }),
    { action: "object.delete", message: `Objet supprimé : ${target?.ref} (${target?.name})` },
  );
}

export function markToDonate(id: string, donate: boolean) {
  const target = state?.objects.find((o) => o.id === id);
  commit(
    (s) => ({ objects: s.objects.map((o) => (o.id === id ? { ...o, status: donate ? ("a_donner" as const) : ("en_stock" as const) } : o)) }),
    { action: "object.status", message: donate ? `Objet ${target?.ref} marqué à donner` : `Objet ${target?.ref} remis en stock` },
  );
}

// ---------------------------------------------------------------- declarations

export function setDeclarationStatus(id: string, status: DeclarationStatus, objectId?: string) {
  const target = state?.declarations.find((d) => d.id === id);
  commit(
    (s) => ({ declarations: s.declarations.map((d) => (d.id === id ? { ...d, status, objectId: objectId ?? (status === "ouverte" ? undefined : d.objectId) } : d)) }),
    {
      action: "declaration.status",
      message: `Déclaration ${target?.ref} : ${status === "cloturee" ? "clôturée" : status === "correspondance" ? "correspondance trouvée" : "rouverte"}`,
    },
  );
}

export function deleteDeclaration(id: string) {
  const target = state?.declarations.find((d) => d.id === id);
  commit(
    (s) => ({ declarations: s.declarations.filter((d) => d.id !== id) }),
    { action: "declaration.delete", message: `Déclaration supprimée : ${target?.ref}` },
  );
}

/** Simulates what a borne will do once connected: a new declaration arriving. */
export function receiveDemoDeclaration() {
  commit(
    (s) => {
      const { n, ref } = nextRef(s, "declaration");
      const declaration: Declaration = {
        id: crypto.randomUUID(),
        ref,
        kind: "perdu",
        nom: "Durand",
        prenom: "Alice",
        classe: "2nde C",
        telephone: "06 00 11 22 33",
        objectName: "Gourde verte",
        category: "autre",
        description: "Métal, bouchon noir, quelques rayures.",
        location: "Gymnase",
        photos: [],
        kioskId: s.kiosks[0]?.id ?? "",
        createdAt: new Date().toISOString(),
        status: "ouverte",
      };
      return { declarations: [declaration, ...s.declarations], counters: { ...s.counters, declaration: n + 1 } };
    },
    { action: "declaration.create", message: "Déclaration reçue depuis la borne (démo)", actor: "Borne d'entrée principale" },
  );
}

// ---------------------------------------------------------------- restitutions

export type RestitutionInput = {
  objectId: string;
  nom: string;
  prenom: string;
  classe: string;
  idChecked: boolean;
  note: string;
  declarationId?: string;
};

export function createRestitution(input: RestitutionInput): string | null {
  const object = state?.objects.find((o) => o.id === input.objectId);
  if (!state || !object) return null;
  const id = crypto.randomUUID();
  commit(
    (s) => {
      const { n, ref } = nextRef(s, "restitution");
      const doneBy = s.staff.find((m) => m.id === s.currentUserId)?.name ?? "—";
      const restitution: Restitution = {
        id,
        ref,
        objectId: object.id,
        objectRef: object.ref,
        objectName: object.name,
        nom: input.nom,
        prenom: input.prenom,
        classe: input.classe,
        idChecked: input.idChecked,
        note: input.note,
        doneAt: new Date().toISOString(),
        doneBy,
        declarationId: input.declarationId,
      };
      return {
        restitutions: [restitution, ...s.restitutions],
        objects: s.objects.map((o) => (o.id === object.id ? { ...o, status: "restitue" as const, restitutionId: id } : o)),
        declarations: input.declarationId
          ? s.declarations.map((d) => (d.id === input.declarationId ? { ...d, status: "cloturee" as const, objectId: object.id } : d))
          : s.declarations,
        counters: { ...s.counters, restitution: n + 1 },
      };
    },
    { action: "restitution.create", message: `Objet ${object.ref} rendu à ${input.prenom} ${input.nom}` },
  );
  return id;
}

// ---------------------------------------------------------------- staff

export function createStaff(input: { name: string; email: string; role: StaffRole }): { error?: string } {
  if (state?.staff.some((m) => m.email.toLowerCase() === input.email.toLowerCase())) return { error: "Un membre avec cet e-mail existe déjà." };
  commit(
    (s) => ({ staff: [...s.staff, { id: crypto.randomUUID(), active: true, createdAt: new Date().toISOString(), ...input }] }),
    { action: "staff.create", message: `Accès créé pour ${input.name}` },
  );
  return {};
}

export function updateStaff(id: string, patch: Partial<Pick<StaffMember, "name" | "email" | "role" | "active">>): { error?: string } {
  if (!state) return {};
  const target = state.staff.find((m) => m.id === id);
  const willLoseAdmin = target?.role === "admin" && (patch.role && patch.role !== "admin" || patch.active === false);
  if (willLoseAdmin && state.staff.filter((m) => m.role === "admin" && m.active).length <= 1) {
    return { error: "Il doit rester au moins un administrateur actif." };
  }
  commit((s) => ({ staff: s.staff.map((m) => (m.id === id ? { ...m, ...patch } : m)) }), { action: "staff.update", message: `Accès modifié : ${target?.name}` });
  return {};
}

export function deleteStaff(id: string): { error?: string } {
  if (!state) return {};
  const target = state.staff.find((m) => m.id === id);
  if (id === state.currentUserId) return { error: "Vous ne pouvez pas supprimer votre propre accès." };
  if (target?.role === "admin" && state.staff.filter((m) => m.role === "admin" && m.active).length <= 1) {
    return { error: "Il doit rester au moins un administrateur actif." };
  }
  commit((s) => ({ staff: s.staff.filter((m) => m.id !== id) }), { action: "staff.delete", message: `Accès supprimé : ${target?.name}` });
  return {};
}

/** Demo only: lets you see the app as another member to check the permissions. */
export function switchUser(id: string) {
  commit(() => ({ currentUserId: id }));
}

// ---------------------------------------------------------------- kiosks

const pairingCode = () => String(Math.floor(100000 + Math.random() * 900000));

export function createKiosk(input: { name: string; location: string }): Kiosk {
  const kiosk: Kiosk = { id: crypto.randomUUID(), version: "2.4", createdAt: new Date().toISOString(), lastSeenAt: null, pairingCode: pairingCode(), ...input };
  commit((s) => ({ kiosks: [...s.kiosks, kiosk] }), { action: "kiosk.create", message: `Borne ajoutée : ${input.name}` });
  return kiosk;
}

export function updateKiosk(id: string, patch: Partial<Pick<Kiosk, "name" | "location">>) {
  commit((s) => ({ kiosks: s.kiosks.map((k) => (k.id === id ? { ...k, ...patch } : k)) }), { action: "kiosk.update", message: `Borne modifiée : ${patch.name ?? id}` });
}

export function deleteKiosk(id: string) {
  const target = state?.kiosks.find((k) => k.id === id);
  commit((s) => ({ kiosks: s.kiosks.filter((k) => k.id !== id) }), { action: "kiosk.delete", message: `Borne supprimée : ${target?.name}` });
}

// ---------------------------------------------------------------- settings

export function saveSettings(settings: Settings) {
  commit(() => ({ settings }), { action: "settings.update", message: "Paramètres de l'établissement enregistrés" });
}
