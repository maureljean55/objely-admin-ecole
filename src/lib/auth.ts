"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeed } from "./seed";
import type { StaffRole } from "./types";

// Staff sign-in.
//  - With the objely-ecole project's URL and publishable key set (NEXT_PUBLIC_SUPABASE_URL /
//    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) it signs in against Supabase Auth and links the account to its
//    membership (claim_membership). The establishment's account is created by the Objely platform admin with a
//    generated password and flagged `must_change_password` until the establishment picks its own.
//  - Without them it runs in DEMO mode: the accounts of the demo staff list, one shared demo password.
//    The data is fake and lives in the browser, so this gate protects nothing real. It only shows the flow.

export const DEMO_PASSWORD = "demo-objely";
export const DEMO_EMAIL = "camille.martin@lycee-jean-moulin.fr";

export type Session = {
  mode: "demo" | "supabase";
  email: string;
  /** Real accounts only: who is signed in, and for which establishment. */
  name?: string;
  role?: StaffRole;
  organizationName?: string;
  /** True while the account still uses the provisional password it was created with. */
  mustChangePassword?: boolean;
};

const KEY = "objely-ecole-admin:session";

let client: SupabaseClient | null | undefined;

function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export const authIsReal = () => getSupabase() !== null;

function readStored(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    return parsed && (parsed.mode === "demo" || parsed.mode === "supabase") && typeof parsed.email === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function store(session: Session | null) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the session then only lasts until the page is closed.
  }
}

/** The signed-in session, or null. For real accounts, checks that the token is still valid and reads the live flag. */
export async function checkSession(): Promise<Session | null> {
  const stored = readStored();
  if (!stored) return null;
  if (stored.mode === "demo") return authIsReal() ? null : stored;

  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    store(null);
    return null;
  }
  // The flag lives in the account itself, so it follows the person, not the browser.
  const mustChangePassword = data.session.user.user_metadata?.must_change_password === true;
  const session = { ...stored, mustChangePassword };
  store(session);
  return session;
}

export async function signOut() {
  store(null);
  try {
    await getSupabase()?.auth.signOut();
  } catch {
    // Already signed out, or offline: the local session is gone either way.
  }
}

export type SignInResult =
  | { ok: true; mustChangePassword: boolean }
  | { ok: false; reason: "invalid" | "no_membership" | "rate_limited" | "network" };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const address = email.trim().toLowerCase();
  const supabase = getSupabase();

  if (!supabase) {
    const known = createSeed().staff.some((m) => m.active && m.email.toLowerCase() === address);
    if (!known || password !== DEMO_PASSWORD) return { ok: false, reason: "invalid" };
    store({ mode: "demo", email: address });
    return { ok: true, mustChangePassword: false };
  }

  try {
    const { data: auth, error } = await supabase.auth.signInWithPassword({ email: address, password });
    if (error) return { ok: false, reason: error.status === 429 ? "rate_limited" : "invalid" };

    // Ties this account to the membership an administrator created for its e-mail.
    const { data: claims, error: claimError } = await supabase.rpc("claim_membership");
    if (claimError) throw claimError;
    const claim = Array.isArray(claims) ? (claims[0] as { organization_id: string; member_id: string; role: StaffRole } | undefined) : undefined;
    if (!claim) {
      await supabase.auth.signOut();
      return { ok: false, reason: "no_membership" };
    }

    const [{ data: member }, { data: organization }] = await Promise.all([
      supabase.from("members").select("full_name").eq("id", claim.member_id).maybeSingle<{ full_name: string }>(),
      supabase.from("organizations").select("name").eq("id", claim.organization_id).maybeSingle<{ name: string }>(),
    ]);

    const mustChangePassword = auth.user.user_metadata?.must_change_password === true;
    store({
      mode: "supabase",
      email: address,
      name: member?.full_name ?? address,
      role: claim.role,
      organizationName: organization?.name,
      mustChangePassword,
    });
    return { ok: true, mustChangePassword };
  } catch {
    return { ok: false, reason: "network" };
  }
}

// ---------------------------------------------------------------- password change

export const PASSWORD_MIN_LENGTH = 10;

export type PasswordChecks = { length: boolean; letter: boolean; digit: boolean };

export function checkPassword(password: string): PasswordChecks {
  return { length: password.length >= PASSWORD_MIN_LENGTH, letter: /[A-Za-z]/.test(password), digit: /[0-9]/.test(password) };
}

export const passwordIsStrongEnough = (password: string) => Object.values(checkPassword(password)).every(Boolean);

export type ChangePasswordResult = { ok: true } | { ok: false; reason: "not_available" | "wrong_current" | "same" | "weak" | "session" | "network" };

/** Checks the current password first, so a borrowed open session can't take the account over. */
export async function changePassword(current: string, next: string): Promise<ChangePasswordResult> {
  const supabase = getSupabase();
  const stored = readStored();
  if (!supabase || stored?.mode !== "supabase") return { ok: false, reason: "not_available" };
  if (next === current) return { ok: false, reason: "same" };
  if (!passwordIsStrongEnough(next)) return { ok: false, reason: "weak" };

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return { ok: false, reason: "session" };

    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: stored.email, password: current });
    if (verifyError) return { ok: false, reason: verifyError.status === 429 ? "network" : "wrong_current" };

    const { error } = await supabase.auth.updateUser({ password: next, data: { must_change_password: false } });
    if (error) {
      if (error.code === "same_password") return { ok: false, reason: "same" };
      if (error.code === "weak_password") return { ok: false, reason: "weak" };
      return { ok: false, reason: "network" };
    }
    store({ ...stored, mustChangePassword: false });
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** Never reveals whether an e-mail has an account. In demo mode there is nothing to reset. */
export async function sendPasswordReset(email: string): Promise<{ ok: boolean }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false };
  try {
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/login` });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Only same-site paths: a "next" parameter must never send someone to another domain. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/";
}
