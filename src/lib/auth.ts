"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSeed } from "./seed";

// Staff sign-in.
//  - With the objely-ecole project's URL and publishable key set (NEXT_PUBLIC_SUPABASE_URL /
//    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) it signs in against Supabase Auth and links the account to its
//    membership (claim_membership). This path has not been exercised yet: no keys were available.
//  - Without them it runs in DEMO mode: the accounts of the demo staff list, one shared demo password.
//    The data is fake and lives in the browser, so this gate protects nothing real. It only shows the flow.

export const DEMO_PASSWORD = "demo-objely";
export const DEMO_EMAIL = "camille.martin@lycee-jean-moulin.fr";

export type Session = { mode: "demo" | "supabase"; email: string };

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

/** The signed-in session, or null. For Supabase sessions, checks that the token is still valid. */
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
  return stored;
}

export async function signOut() {
  store(null);
  try {
    await getSupabase()?.auth.signOut();
  } catch {
    // Already signed out, or offline: the local session is gone either way.
  }
}

export type SignInResult = { ok: true } | { ok: false; reason: "invalid" | "no_membership" | "rate_limited" | "network" };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const address = email.trim().toLowerCase();
  const supabase = getSupabase();

  if (!supabase) {
    const known = createSeed().staff.some((m) => m.active && m.email.toLowerCase() === address);
    if (!known || password !== DEMO_PASSWORD) return { ok: false, reason: "invalid" };
    store({ mode: "demo", email: address });
    return { ok: true };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({ email: address, password });
    if (error) return { ok: false, reason: error.status === 429 ? "rate_limited" : "invalid" };

    // Ties this account to the membership an administrator created for its e-mail.
    const { data, error: claimError } = await supabase.rpc("claim_membership");
    if (claimError) throw claimError;
    if (!Array.isArray(data) || data.length === 0) {
      await supabase.auth.signOut();
      return { ok: false, reason: "no_membership" };
    }
    store({ mode: "supabase", email: address });
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
