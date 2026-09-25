"use client";

import { useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./auth";
import { explain, fail, type Result } from "./errors";
import type {
  CategoryId,
  Declaration,
  DeclarationStatus,
  Kiosk,
  LogEntry,
  PairingCodeRecord,
  Restitution,
  Settings,
  StaffMember,
  StaffRole,
  State,
  StoredObject,
} from "./types";

// The establishment's data, read from and written to the objely-ecole Supabase project.
// Access is enforced by the database (row-level security per establishment and role): this file only
// mirrors the rows in memory so the pages stay fast, and refetches after every change.

const PHOTO_BUCKET = "object-photos";

let state: State | null = null;
let orgId: string | null = null;
let channel: RealtimeChannel | null = null;
let loadError: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** null until the establishment's data has loaded. */
export function useStoreState(): State | null {
  return useSyncExternalStore(subscribe, () => state, () => null);
}
export const useStoreError = () => useSyncExternalStore(subscribe, () => loadError, () => null);

// ---------------------------------------------------------------- row → app types

type ObjectRow = {
  id: string; ref: string; name: string; category: CategoryId; description: string; found_at: string | null; found_on: string;
  deposited_at: string; storage_place: string; photo_path: string | null; thumb: string | null; status: StoredObject["status"];
  restitution_id: string | null; from_declaration_id: string | null;
};
const OBJECT_COLUMNS = "id, ref, name, category, description, found_at, found_on, deposited_at, storage_place, photo_path, thumb, status, restitution_id, from_declaration_id";
const toObject = (r: ObjectRow): StoredObject => ({
  id: r.id, ref: r.ref, name: r.name, category: r.category, description: r.description, foundAt: r.found_at ?? "", foundOn: r.found_on,
  depositedAt: r.deposited_at, storage: r.storage_place, photo: r.thumb ?? undefined, photoPath: r.photo_path ?? undefined, status: r.status,
  restitutionId: r.restitution_id ?? undefined, fromDeclarationId: r.from_declaration_id ?? undefined,
});

type DeclarationRow = {
  id: string; ref: string; kind: Declaration["kind"]; nom: string; prenom: string; classe: string; telephone: string | null; object_name: string;
  category: CategoryId; description: string; location: string | null; kiosk_id: string | null; status: DeclarationStatus; object_id: string | null; created_at: string;
  matched_declaration_id?: string | null;
};
const DECLARATION_COLUMNS = "id, ref, kind, nom, prenom, classe, telephone, object_name, category, description, location, kiosk_id, status, object_id, created_at";
const toDeclaration = (r: DeclarationRow): Declaration => ({
  id: r.id, ref: r.ref, kind: r.kind, nom: r.nom, prenom: r.prenom, classe: r.classe, telephone: r.telephone ?? "", objectName: r.object_name,
  category: r.category, description: r.description, location: r.location ?? "", photos: [], kioskId: r.kiosk_id ?? "", createdAt: r.created_at,
  status: r.status, objectId: r.object_id ?? undefined, matchedDeclarationId: r.matched_declaration_id ?? undefined,
});

type RestitutionRow = {
  id: string; ref: string; object_id: string | null; object_ref: string; object_name: string; nom: string; prenom: string; classe: string;
  id_checked: boolean; note: string; done_at: string; done_by_name: string; declaration_id: string | null;
};
const RESTITUTION_COLUMNS = "id, ref, object_id, object_ref, object_name, nom, prenom, classe, id_checked, note, done_at, done_by_name, declaration_id";
const toRestitution = (r: RestitutionRow): Restitution => ({
  id: r.id, ref: r.ref, objectId: r.object_id ?? "", objectRef: r.object_ref, objectName: r.object_name, nom: r.nom, prenom: r.prenom, classe: r.classe,
  idChecked: r.id_checked, note: r.note, doneAt: r.done_at, doneBy: r.done_by_name, declarationId: r.declaration_id ?? undefined,
});

type MemberRow = { id: string; email: string; full_name: string; role: StaffRole; active: boolean; last_seen_at: string | null; created_at: string };
const toMember = (r: MemberRow): StaffMember => ({ id: r.id, email: r.email, name: r.full_name, role: r.role, active: r.active, createdAt: r.created_at, lastSeenAt: r.last_seen_at ?? undefined });

type KioskRow = { id: string; name: string; location: string | null; version: string; pairing_code: string | null; pairing_expires_at: string | null; paired_at: string | null; last_seen_at: string | null; created_at: string; paused_at?: string | null };
const toKiosk = (r: KioskRow): Kiosk => ({
  id: r.id, name: r.name, location: r.location ?? "", version: r.version, createdAt: r.created_at, lastSeenAt: r.last_seen_at,
  pairingCode: r.pairing_code ?? undefined, pairingExpiresAt: r.pairing_expires_at ?? undefined, pairedAt: r.paired_at ?? undefined,
  pausedAt: r.paused_at ?? undefined,
});

type CodeRow = { id: string; code: string; kiosk_name: string; created_at: string; created_by_name: string | null; expires_at: string; used_at: string | null; replaced_at: string | null };
const toCode = (r: CodeRow): PairingCodeRecord => ({
  id: r.id, code: r.code, kioskName: r.kiosk_name, createdAt: r.created_at, createdBy: r.created_by_name, expiresAt: r.expires_at, usedAt: r.used_at, replacedAt: r.replaced_at,
});

type OrgRow = { id: string; name: string; type: Settings["schoolType"]; address: string | null; phone: string | null; contact_email: string | null; retention_days: number; idle_seconds: number; help_desk: string | null; max_kiosks?: number | null };
const toSettings = (r: OrgRow): Settings => ({
  schoolName: r.name, schoolType: r.type, address: r.address ?? "", phone: r.phone ?? "", email: r.contact_email ?? "",
  retentionDays: r.retention_days, idleSeconds: r.idle_seconds, helpDesk: r.help_desk ?? "", maxKiosks: r.max_kiosks ?? null,
});

type LogRow = { id: string; created_at: string; actor_name: string; action: string; message: string };
const toLog = (r: LogRow): LogEntry => ({ id: r.id, at: r.created_at, actor: r.actor_name, action: r.action, message: r.message });

// ---------------------------------------------------------------- loading

const LIMIT = 1000;

async function fetchers() {
  const db = getSupabase();
  if (!db || !orgId) throw new Error("not_ready");
  return {
    objects: async () => {
      const { data, error } = await db.from("objects").select(OBJECT_COLUMNS).order("deposited_at", { ascending: false }).limit(LIMIT).returns<ObjectRow[]>();
      if (error) throw error;
      return data.map(toObject);
    },
    declarations: async () => {
      const list = (columns: string) => db.from("declarations").select(columns).order("created_at", { ascending: false }).limit(LIMIT).returns<DeclarationRow[]>();
      let { data, error } = await list(`${DECLARATION_COLUMNS}, matched_declaration_id`);
      // 42703: the instant-matching migration is not applied yet on this database.
      if (error?.code === "42703") ({ data, error } = await list(DECLARATION_COLUMNS));
      if (error) throw error;
      return (data ?? []).map(toDeclaration);
    },
    restitutions: async () => {
      const { data, error } = await db.from("restitutions").select(RESTITUTION_COLUMNS).order("done_at", { ascending: false }).limit(LIMIT).returns<RestitutionRow[]>();
      if (error) throw error;
      return data.map(toRestitution);
    },
    staff: async () => {
      const { data, error } = await db.from("members").select("id, email, full_name, role, active, last_seen_at, created_at").order("created_at").returns<MemberRow[]>();
      if (error) throw error;
      return data.map(toMember);
    },
    kiosks: async () => {
      const columns = "id, name, location, version, pairing_code, pairing_expires_at, paired_at, last_seen_at, created_at";
      const list = (select: string) => db.from("kiosks").select(select).order("created_at").returns<KioskRow[]>();
      let { data, error } = await list(`${columns}, paused_at`);
      // 42703: the kiosk-pause migration is not applied yet; 42501: the column is not readable yet (its grant comes in a
      // later migration). Either way, load the bornes without it rather than failing the whole app.
      if (error?.code === "42703" || error?.code === "42501") ({ data, error } = await list(columns));
      if (error) throw error;
      return (data ?? []).map(toKiosk);
    },
    pairingCodes: async () => {
      const { data, error } = await db.from("kiosk_pairing_codes").select("id, code, kiosk_name, created_at, created_by_name, expires_at, used_at, replaced_at").order("created_at", { ascending: false }).limit(200).returns<CodeRow[]>();
      if (error) throw error;
      return data.map(toCode);
    },
    settings: async () => {
      const columns = "id, name, type, address, phone, contact_email, retention_days, idle_seconds, help_desk";
      const read = (select: string) => db.from("organizations").select(select).eq("id", orgId!).single<OrgRow>();
      let { data, error } = await read(`${columns}, max_kiosks`);
      // 42703: the kiosk-limit migration is not applied yet on this database.
      if (error?.code === "42703") ({ data, error } = await read(columns));
      if (error || !data) throw error;
      return toSettings(data);
    },
    log: async () => {
      const { data, error } = await db.from("audit_log").select("id, created_at, actor_name, action, message").order("created_at", { ascending: false }).limit(500).returns<LogRow[]>();
      if (error) throw error;
      return data.map(toLog);
    },
  };
}

type Table = keyof Awaited<ReturnType<typeof fetchers>>;

/** Refetches some tables. A failure keeps what is already on screen and reports the error. */
export async function refresh(...tables: Table[]) {
  if (!state) return;
  try {
    const f = await fetchers();
    const results = await Promise.all(tables.map(async (t) => [t, await f[t]()] as const));
    state = { ...state, ...Object.fromEntries(results) };
    loadError = null;
  } catch (error) {
    loadError = explain(error as { message?: string; code?: string });
  }
  emit();
}

/** Loads the establishment's data and starts listening for new declarations. Returns a cleanup function. */
export function startStore(organizationId: string): () => void {
  const db = getSupabase();
  if (!db) return () => {};
  if (orgId !== organizationId) {
    state = null;
    orgId = organizationId;
  }
  loadError = null;

  let stopped = false;
  (async () => {
    try {
      const f = await fetchers();
      const [objects, declarations, restitutions, staff, kiosks, pairingCodes, settings, log] = await Promise.all([
        f.objects(), f.declarations(), f.restitutions(), f.staff(), f.kiosks(), f.pairingCodes(), f.settings(), f.log(),
      ]);
      if (stopped) return;
      state = { objects, declarations, restitutions, staff, kiosks, pairingCodes, settings, log, organizationId };
      emit();
    } catch (error) {
      if (stopped) return;
      loadError = explain(error as { message?: string; code?: string });
      emit();
    }
  })();

  // A borne declaration shows up without reloading the page.
  channel = db
    .channel(`declarations:${organizationId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "declarations", filter: `organization_id=eq.${organizationId}` }, () => {
      void refresh("declarations", "log");
    })
    .subscribe();

  // Other people work at the same time, and the bornes report in: stay current.
  const onVisible = () => document.visibilityState === "visible" && void refresh("objects", "declarations", "restitutions", "kiosks", "pairingCodes", "staff", "log");
  document.addEventListener("visibilitychange", onVisible);
  const interval = setInterval(() => void refresh("kiosks", "pairingCodes"), 60_000);

  return () => {
    stopped = true;
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
    if (channel) void db.removeChannel(channel);
    channel = null;
  };
}

/** Clears everything held in memory (sign-out). */
export function resetStore() {
  state = null;
  orgId = null;
  loadError = null;
  emit();
}

// ---------------------------------------------------------------- objects

export type ObjectInput = {
  name: string;
  category: CategoryId;
  description: string;
  foundAt: string;
  foundOn: string;
  storage: string;
  /** undefined = unchanged, null = remove, otherwise the new photo. */
  photo?: { full: string; thumb: string } | null;
  fromDeclarationId?: string;
};

async function uploadPhoto(full: string): Promise<string> {
  const db = getSupabase()!;
  const blob = await (await fetch(full)).blob();
  const path = `${orgId}/${crypto.randomUUID()}.jpg`;
  const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}

const removePhoto = async (path?: string) => {
  if (path) await getSupabase()?.storage.from(PHOTO_BUCKET).remove([path]).catch(() => {});
};

export async function createObject(input: ObjectInput): Promise<Result<{ id: string }>> {
  const db = getSupabase();
  if (!db || !orgId) return fail(null);
  let photoPath: string | undefined;
  try {
    if (input.photo) photoPath = await uploadPhoto(input.photo.full);
    const { data, error } = await db
      .from("objects")
      .insert({
        organization_id: orgId, name: input.name, category: input.category, description: input.description, found_at: input.foundAt || null,
        found_on: input.foundOn, storage_place: input.storage, photo_path: photoPath ?? null, thumb: input.photo?.thumb ?? null,
        from_declaration_id: input.fromDeclarationId ?? null,
      })
      .select("id")
      .single<{ id: string }>();
    if (error) throw error;

    if (input.fromDeclarationId) {
      // The declaration this object came from is now handled.
      await db.from("declarations").update({ status: "cloturee", object_id: data.id }).eq("id", input.fromDeclarationId);
    }
    await refresh("objects", "declarations", "log");
    return { ok: true, id: data.id };
  } catch (error) {
    await removePhoto(photoPath);
    return fail(error as { message?: string; code?: string });
  }
}

export async function updateObject(id: string, input: ObjectInput): Promise<Result> {
  const db = getSupabase();
  const current = state?.objects.find((o) => o.id === id);
  if (!db || !current) return fail(null);
  let newPath: string | undefined;
  try {
    const patch: Record<string, unknown> = {
      name: input.name, category: input.category, description: input.description, found_at: input.foundAt || null, found_on: input.foundOn, storage_place: input.storage,
    };
    if (input.photo === null) Object.assign(patch, { photo_path: null, thumb: null });
    else if (input.photo) {
      newPath = await uploadPhoto(input.photo.full);
      Object.assign(patch, { photo_path: newPath, thumb: input.photo.thumb });
    }
    const { error } = await db.from("objects").update(patch).eq("id", id);
    if (error) throw error;
    if (input.photo !== undefined) await removePhoto(current.photoPath);
    await refresh("objects", "log");
    return { ok: true };
  } catch (error) {
    await removePhoto(newPath);
    return fail(error as { message?: string; code?: string });
  }
}

export async function deleteObject(id: string): Promise<Result> {
  const db = getSupabase();
  const current = state?.objects.find((o) => o.id === id);
  if (!db || !current) return fail(null);
  const { error } = await db.from("objects").delete().eq("id", id);
  if (error) return fail(error);
  await removePhoto(current.photoPath);
  await refresh("objects", "declarations", "log");
  return { ok: true };
}

export async function markToDonate(id: string, donate: boolean): Promise<Result> {
  const { error } = await getSupabase()!.from("objects").update({ status: donate ? "a_donner" : "en_stock" }).eq("id", id);
  if (error) return fail(error);
  await refresh("objects", "log");
  return { ok: true };
}

/** A short-lived link to the full-size photo (the bucket is private). */
export async function getObjectPhotoUrl(path: string): Promise<string | null> {
  const { data } = await getSupabase()!.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// ---------------------------------------------------------------- declarations

export async function setDeclarationStatus(id: string, status: DeclarationStatus): Promise<Result> {
  const { error } = await getSupabase()!.from("declarations").update({ status }).eq("id", id);
  if (error) return fail(error);
  await refresh("declarations", "log");
  return { ok: true };
}

export async function deleteDeclaration(id: string): Promise<Result> {
  const { error } = await getSupabase()!.from("declarations").delete().eq("id", id);
  if (error) return fail(error);
  await refresh("declarations", "objects", "log");
  return { ok: true };
}

/** Photos sent from the borne, loaded only when a declaration is opened (they are large). */
export async function loadDeclarationPhotos(id: string): Promise<string[]> {
  const { data } = await getSupabase()!.from("declaration_photos").select("data").eq("declaration_id", id).order("sort_order").returns<{ data: string }[]>();
  return (data ?? []).map((p) => p.data);
}

// ---------------------------------------------------------------- restitutions

export type RestitutionInput = { objectId: string; nom: string; prenom: string; classe: string; idChecked: boolean; note: string; declarationId?: string };

export async function createRestitution(input: RestitutionInput): Promise<Result<{ id: string }>> {
  const { data, error } = await getSupabase()!.rpc("restitute_object", {
    p_object_id: input.objectId, p_nom: input.nom, p_prenom: input.prenom, p_classe: input.classe,
    p_id_checked: input.idChecked, p_note: input.note, p_declaration_id: input.declarationId ?? null,
  });
  if (error) return fail(error);
  await refresh("objects", "restitutions", "declarations", "log");
  return { ok: true, id: data as string };
}

// ---------------------------------------------------------------- staff

export async function updateStaff(id: string, patch: Partial<Pick<StaffMember, "name" | "role" | "active">>): Promise<Result> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.full_name = patch.name;
  if (patch.role !== undefined) update.role = patch.role;
  if (patch.active !== undefined) update.active = patch.active;
  const { error } = await getSupabase()!.from("members").update(update).eq("id", id);
  if (error) return fail(error);
  await refresh("staff", "log");
  return { ok: true };
}

// ---------------------------------------------------------------- kiosks

export async function createKiosk(input: { name: string; location: string }): Promise<Result<{ kiosk: Kiosk }>> {
  const db = getSupabase();
  if (!db || !orgId) return fail(null);
  const { data, error } = await db
    .from("kiosks")
    .insert({ organization_id: orgId, name: input.name, location: input.location || null })
    .select("id, name, location, version, pairing_code, pairing_expires_at, paired_at, last_seen_at, created_at")
    .single<KioskRow>();
  if (error) return fail(error);
  await refresh("kiosks", "pairingCodes", "log");
  return { ok: true, kiosk: toKiosk(data) };
}

export async function updateKiosk(id: string, patch: { name: string; location: string }): Promise<Result> {
  const { error } = await getSupabase()!.from("kiosks").update({ name: patch.name, location: patch.location || null }).eq("id", id);
  if (error) return fail(error);
  await refresh("kiosks", "log");
  return { ok: true };
}

export async function deleteKiosk(id: string): Promise<Result> {
  const { error } = await getSupabase()!.from("kiosks").delete().eq("id", id);
  if (error) return fail(error);
  await refresh("kiosks", "pairingCodes", "declarations", "log");
  return { ok: true };
}

export async function regeneratePairingCode(id: string): Promise<Result<{ code: string }>> {
  const { data, error } = await getSupabase()!.rpc("regenerate_kiosk_pairing_code", { p_kiosk_id: id });
  if (error) return fail(error);
  await refresh("kiosks", "pairingCodes", "log");
  return { ok: true, code: data as string };
}

/** Pauses a borne (it shows a "borne en pause" screen and accepts nothing) or resumes it. */
export async function setKioskPaused(id: string, paused: boolean): Promise<Result> {
  const { error } = await getSupabase()!.rpc("set_kiosk_paused", { p_kiosk_id: id, p_paused: paused });
  if (error) return fail(error);
  await refresh("kiosks", "log");
  return { ok: true };
}

/** Sets a code chosen by the administrator (6 letters or digits). */
export async function setPairingCode(id: string, code: string): Promise<Result<{ code: string }>> {
  const { data, error } = await getSupabase()!.rpc("set_kiosk_pairing_code", { p_kiosk_id: id, p_code: code });
  if (error) return fail(error);
  await refresh("kiosks", "pairingCodes", "log");
  return { ok: true, code: data as string };
}

// ---------------------------------------------------------------- settings

export async function saveSettings(s: Settings): Promise<Result> {
  const { error } = await getSupabase()!
    .from("organizations")
    .update({
      name: s.schoolName, type: s.schoolType, address: s.address || null, phone: s.phone || null, contact_email: s.email.toLowerCase() || null,
      retention_days: s.retentionDays, idle_seconds: s.idleSeconds, help_desk: s.helpDesk || null,
    })
    .eq("id", orgId!);
  if (error) return fail(error);
  await refresh("settings", "log");
  return { ok: true };
}
