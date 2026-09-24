"use server";

import { randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StaffRole } from "@/lib/types";

// Staff accounts. Creating a sign-in account needs the project's service key, which must never reach the browser:
// these actions run on the server. The caller proves who they are with their own access token, and is only
// allowed to act if the database says they are an active administrator of an establishment.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.ECOLE_SUPABASE_SECRET_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://objely-ecole-admin.vercel.app";

export type StaffCredentials = { name: string; email: string; password: string; loginUrl: string };
export type StaffResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES: StaffRole[] = ["admin", "vie_scolaire", "lecture"];

// Letters and digits that can't be mistaken for one another (no 0/O, 1/I/L): read over the phone or typed from paper.
const READABLE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generatePassword(): string {
  const bytes = randomBytes(16);
  return Array.from({ length: 4 }, (_, g) => Array.from({ length: 4 }, (_, i) => READABLE[bytes[g * 4 + i] % READABLE.length]).join("")).join("-");
}

type Caller = { service: SupabaseClient; asUser: SupabaseClient; userId: string; memberId: string; organizationId: string };

async function authorize(token: string): Promise<Caller | { error: string }> {
  if (!URL || !PUBLISHABLE || !SECRET) return { error: "Le serveur n'est pas configuré pour gérer les comptes (ECOLE_SUPABASE_SECRET_KEY manquante)." };
  if (!token) return { error: "Votre session a expiré. Reconnectez-vous." };

  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const service = createClient(URL, SECRET, opts);
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) return { error: "Votre session a expiré. Reconnectez-vous." };

  // Everything the caller reads or writes goes through their own token, so row-level security and the audit log apply.
  const asUser = createClient(URL, PUBLISHABLE, { ...opts, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: me } = await asUser
    .from("members")
    .select("id, organization_id, role, active")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle<{ id: string; organization_id: string; role: StaffRole; active: boolean }>();
  if (!me) return { error: "Ce compte n'est rattaché à aucun établissement." };
  if (me.role !== "admin") return { error: "Seul un administrateur peut gérer les comptes." };
  return { service, asUser, userId: data.user.id, memberId: me.id, organizationId: me.organization_id };
}

const isError = (c: Caller | { error: string }): c is { error: string } => "error" in c;

export async function createStaffAccount(token: string, input: { name: string; email: string; role: StaffRole }): Promise<StaffResult<{ credentials: StaffCredentials }>> {
  const caller = await authorize(token);
  if (isError(caller)) return { ok: false, error: caller.error };

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || name.length > 80) return { ok: false, error: "Le nom est requis (80 caractères maximum)." };
  if (!EMAIL.test(email) || email.length > 160) return { ok: false, error: "L'e-mail n'est pas valide." };
  if (!ROLES.includes(input.role)) return { ok: false, error: "Rôle invalide." };

  const password = generatePassword();
  const { data: created, error: userError } = await caller.service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, must_change_password: true },
  });
  if (userError || !created.user) {
    const exists = userError?.code === "email_exists" || /already|registered|exists/i.test(userError?.message ?? "");
    return { ok: false, error: exists ? "Cette adresse e-mail a déjà un compte. Utilisez celle d'une autre personne." : "Le compte n'a pas pu être créé." };
  }

  // The membership row is written as the administrator, so the database logs who added this person.
  const { data: member, error: memberError } = await caller.asUser
    .from("members")
    .insert({ organization_id: caller.organizationId, email, full_name: name, role: input.role, active: true })
    .select("id")
    .single<{ id: string }>();
  if (memberError || !member) {
    await caller.service.auth.admin.deleteUser(created.user.id); // no orphan account
    return { ok: false, error: memberError?.code === "23505" ? "Une personne avec cet e-mail existe déjà dans votre établissement." : "Le compte n'a pas pu être créé." };
  }
  await caller.service.from("members").update({ user_id: created.user.id }).eq("id", member.id);

  return { ok: true, credentials: { name, email, password, loginUrl: `${SITE}/login` } };
}

async function targetOf(caller: Caller, memberId: string) {
  // Read as the administrator: only members of their own establishment are visible.
  const { data } = await caller.asUser.from("members").select("id, email, full_name").eq("id", memberId).maybeSingle<{ id: string; email: string; full_name: string }>();
  if (!data) return null;
  const { data: row } = await caller.service.from("members").select("user_id").eq("id", memberId).maybeSingle<{ user_id: string | null }>();
  return { ...data, userId: row?.user_id ?? null };
}

export async function resetStaffPassword(token: string, memberId: string): Promise<StaffResult<{ credentials: StaffCredentials }>> {
  const caller = await authorize(token);
  if (isError(caller)) return { ok: false, error: caller.error };
  if (memberId === caller.memberId) return { ok: false, error: "Pour changer votre propre mot de passe, utilisez les Paramètres." };

  const target = await targetOf(caller, memberId);
  if (!target) return { ok: false, error: "Cette personne n'existe plus." };
  if (!target.userId) return { ok: false, error: "Cette personne n'a pas de compte de connexion." };

  const { data: current } = await caller.service.auth.admin.getUserById(target.userId);
  const password = generatePassword();
  const { error } = await caller.service.auth.admin.updateUserById(target.userId, {
    password,
    user_metadata: { ...(current?.user?.user_metadata ?? {}), must_change_password: true },
  });
  if (error) return { ok: false, error: "Le mot de passe n'a pas pu être réinitialisé." };
  return { ok: true, credentials: { name: target.full_name, email: target.email, password, loginUrl: `${SITE}/login` } };
}

export async function deleteStaffAccount(token: string, memberId: string): Promise<StaffResult> {
  const caller = await authorize(token);
  if (isError(caller)) return { ok: false, error: caller.error };
  if (memberId === caller.memberId) return { ok: false, error: "Vous ne pouvez pas supprimer votre propre accès." };

  const target = await targetOf(caller, memberId);
  if (!target) return { ok: false, error: "Cette personne n'existe plus." };

  // Through the administrator's own token: the database refuses to remove the last active administrator.
  const { error } = await caller.asUser.from("members").delete().eq("id", memberId);
  if (error) return { ok: false, error: /last_admin/.test(error.message) ? "Il doit rester au moins un administrateur actif." : "La suppression a échoué." };
  if (target.userId) await caller.service.auth.admin.deleteUser(target.userId);
  return { ok: true };
}
