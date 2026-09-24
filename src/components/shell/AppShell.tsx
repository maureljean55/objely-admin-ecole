"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { ToastProvider } from "@/components/ui/Toast";
import { can, type Permission } from "@/lib/permissions";
import { findMatches } from "@/lib/matching";
import { checkSession, signOut, type Session } from "@/lib/auth";
import { resetStore, startStore, useStoreError, useStoreState } from "@/lib/store";
import { initials } from "@/lib/format";
import { ROLES, type StaffMember, type State } from "@/lib/types";

const DataContext = createContext<State | null>(null);

/** The demo state. Only usable under <AppShell>, which renders children once it is loaded. */
export function useData(): State {
  const state = useContext(DataContext);
  if (!state) throw new Error("useData must be used inside <AppShell>");
  return state;
}

const SessionContext = createContext<{ session: Session | null; refresh: () => Promise<void> }>({ session: null, refresh: async () => {} });

/** Who is signed in, and a way to re-read the session after it changed (e.g. the password was updated). */
export const useSession = () => useContext(SessionContext);

export function useCurrentUser(): StaffMember {
  const { session } = useSession();
  const { staff } = useData();
  // The person signed in, as recorded in the establishment's staff list.
  const me = staff.find((m) => m.email.toLowerCase() === session?.email);
  return me ?? { id: "session", name: session?.name ?? session?.email ?? "", email: session?.email ?? "", role: session?.role ?? "lecture", active: true, createdAt: "" };
}

export function useCan(permission: Permission) {
  return can(useCurrentUser(), permission);
}

type NavItem = { href: string; label: string; icon: string; count?: number; exact?: boolean };

export function AppShell({ children }: { children: ReactNode }) {
  const state = useStoreState();
  const storeError = useStoreError();
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  // Nothing is shown before someone has signed in: no session sends you to /login, and back afterwards.
  useEffect(() => {
    let cancelled = false;
    checkSession().then((s) => {
      if (cancelled) return;
      if (!s) {
        resetStore();
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      } else setSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  const organizationId = session?.organizationId;
  useEffect(() => (organizationId ? startStore(organizationId) : undefined), [organizationId]);

  const refresh = async () => setSession(await checkSession());

  if (!session || !state) {
    return (
      <div className="flex h-screen">
        <div className="w-[264px] shrink-0 bg-ink" />
        <div className="flex flex-1 items-center justify-center p-10">
          {storeError ? (
            <div role="alert" className="max-w-md rounded-card border border-danger/30 bg-danger-tint p-6 text-center">
              <p className="text-h2 text-danger">Impossible de charger vos données</p>
              <p className="mt-2 text-body text-ink">{storeError}</p>
              <button type="button" onClick={() => window.location.reload()} className="mt-4 h-10 rounded-field bg-ink px-5 font-semibold text-white">Réessayer</button>
            </div>
          ) : (
            <p className="text-slate">Chargement de vos données…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <DataContext.Provider value={state}>
      <SessionContext.Provider value={{ session, refresh }}>
        <ToastProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="min-w-0 flex-1 overflow-y-auto">
              {session.mustChangePassword && pathname !== "/parametres" && <PasswordBanner />}
              {storeError && <div role="alert" className="border-b border-danger/30 bg-danger-tint px-10 py-2 text-small font-medium text-danger">{storeError}</div>}
              <div className="mx-auto w-full max-w-[1240px] px-10 py-8">{children}</div>
            </main>
          </div>
        </ToastProvider>
      </SessionContext.Provider>
    </DataContext.Provider>
  );
}

// Shown on every page until the provisional password has been replaced.
function PasswordBanner() {
  return (
    <div role="alert" className="sticky top-0 z-30 flex items-center gap-4 border-b border-warn/30 bg-warn-tint px-10 py-3 text-warn">
      <Icon name="lock" size={22} fill />
      <p className="flex-1 text-body">
        <strong className="font-semibold">Veuillez changer votre mot de passe.</strong> Vous utilisez le mot de passe provisoire reçu à l&apos;inscription : choisissez-en un que vous seul connaissez.
      </p>
      <Link href="/parametres#mot-de-passe" className="flex h-9 shrink-0 items-center rounded-field bg-ink px-4 text-small font-semibold text-white hover:brightness-125">
        Changer mon mot de passe
      </Link>
    </div>
  );
}

function Sidebar() {
  const state = useData();
  const pathname = usePathname();

  const counts = useMemo(
    () => ({
      stock: state.objects.filter((o) => o.status === "en_stock").length,
      open: state.declarations.filter((d) => d.status === "ouverte").length,
      matches: findMatches(state.declarations, state.objects).length,
    }),
    [state.objects, state.declarations],
  );

  const groups: { title: string; items: NavItem[] }[] = [
    { title: "Aujourd'hui", items: [{ href: "/", label: "Tableau de bord", icon: "dashboard", exact: true }] },
    {
      title: "Objets",
      items: [
        { href: "/objets", label: "Objets en stock", icon: "inventory_2", count: counts.stock },
        { href: "/declarations", label: "Déclarations", icon: "edit_note", count: counts.open },
        { href: "/correspondances", label: "Correspondances", icon: "compare_arrows", count: counts.matches },
        { href: "/restitutions", label: "Restitutions", icon: "task_alt" },
      ],
    },
    {
      title: "Établissement",
      items: [
        { href: "/bornes", label: "Bornes", icon: "tablet_mac" },
        { href: "/personnel", label: "Personnel", icon: "group" },
        { href: "/parametres", label: "Paramètres", icon: "settings" },
        { href: "/journal", label: "Journal d'activité", icon: "history" },
      ],
    },
  ];

  return (
    <aside className="flex w-[264px] shrink-0 flex-col bg-ink text-white">
      <div className="flex items-center gap-3 px-6 pb-5 pt-6">
        <Image src="/logo/objely-mark.png" alt="" width={44} height={39} priority className="h-[39px] w-[44px]" />
        <div className="leading-tight">
          <p className="font-display text-[22px] font-extrabold tracking-tight">Objely</p>
          <p className="text-small text-white/60">Administration</p>
        </div>
      </div>

      <div className="mx-4 mb-2 rounded-field bg-white/8 px-3 py-2.5">
        <p className="tag !text-white/50">Établissement</p>
        <p className="truncate text-body font-semibold">{state.settings.schoolName}</p>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="tag px-3 pb-1.5 !text-white/40">{group.title}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-10 items-center gap-3 rounded-field px-3 text-body font-medium transition-colors ${
                        active ? "bg-white text-ink" : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon name={item.icon} size={20} fill={active} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span className={`rounded-full px-2 font-mono text-tag font-semibold ${active ? "bg-ink text-white" : "bg-white/15 text-white"}`}>{item.count}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <SignOutLink />
      <UserMenu />
    </aside>
  );
}

function SignOutLink() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="px-3 pb-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await signOut();
          router.push("/login");
        }}
        className="flex h-10 w-full items-center gap-3 rounded-field px-3 text-body font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
      >
        <Icon name="logout" size={20} />
        {busy ? "Déconnexion…" : "Déconnexion"}
      </button>
    </div>
  );
}

function UserMenu() {
  const user = useCurrentUser();

  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-field p-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white font-display text-small font-extrabold text-ink">{initials(user.name)}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-body font-semibold">{user.name}</span>
          <span className="block truncate text-small text-white/60">{ROLES[user.role].label}</span>
        </span>
      </div>
    </div>
  );
}
