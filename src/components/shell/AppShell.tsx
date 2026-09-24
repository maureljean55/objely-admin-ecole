"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { ToastProvider } from "@/components/ui/Toast";
import { can, type Permission } from "@/lib/permissions";
import { findMatches } from "@/lib/matching";
import { checkSession, signOut, type Session } from "@/lib/auth";
import { loadStore, resetDemo, switchUser, useStoreState } from "@/lib/store";
import { initials } from "@/lib/format";
import { ROLES, type State } from "@/lib/types";

const DataContext = createContext<State | null>(null);

/** The demo state. Only usable under <AppShell>, which renders children once it is loaded. */
export function useData(): State {
  const state = useContext(DataContext);
  if (!state) throw new Error("useData must be used inside <AppShell>");
  return state;
}

export function useCurrentUser() {
  const { staff, currentUserId } = useData();
  return staff.find((m) => m.id === currentUserId) ?? staff[0];
}

export function useCan(permission: Permission) {
  return can(useCurrentUser(), permission);
}

type NavItem = { href: string; label: string; icon: string; count?: number; exact?: boolean };

export function AppShell({ children }: { children: ReactNode }) {
  const state = useStoreState();
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => loadStore(), []);

  // Nothing is shown before someone has signed in: no session sends you to /login, and back afterwards.
  useEffect(() => {
    let cancelled = false;
    checkSession().then((s) => {
      if (cancelled) return;
      if (!s) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      else setSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  // In demo mode the signed-in e-mail decides which demo staff member you are.
  // Applied once per sign-in, so the "Voir comme" demo menu can still switch afterwards.
  const appliedFor = useRef<string | null>(null);
  const signedInAs = state && session ? state.staff.find((m) => m.email.toLowerCase() === session.email) : undefined;
  useEffect(() => {
    if (!signedInAs || !session || appliedFor.current === session.email) return;
    appliedFor.current = session.email;
    switchUser(signedInAs.id);
  }, [signedInAs, session]);

  if (!state || !session) {
    return (
      <div className="flex h-screen">
        <div className="w-[264px] shrink-0 bg-ink" />
        <div className="flex-1 p-10 text-slate">Chargement…</div>
      </div>
    );
  }

  return (
    <DataContext.Provider value={state}>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1240px] px-10 py-8">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </DataContext.Provider>
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
  const state = useData();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative border-t border-white/10 p-3">
      {open && (
        <div className="absolute inset-x-3 bottom-[76px] z-20 rounded-card bg-white p-2 text-ink shadow-pop">
          <p className="tag px-2 pb-1 pt-1">Voir comme (démo)</p>
          {state.staff.filter((m) => m.active).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                switchUser(m.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-field px-2 py-1.5 text-left text-small hover:bg-canvas ${m.id === user.id ? "font-semibold" : ""}`}
            >
              <span className="truncate">{m.name}</span>
              <span className="text-mute">{ROLES[m.role].label}</span>
            </button>
          ))}
          <div className="my-1 border-t border-line" />
          <button type="button" onClick={() => { resetDemo(); setOpen(false); }} className="flex w-full items-center gap-2 rounded-field px-2 py-1.5 text-left text-small text-slate hover:bg-canvas">
            <Icon name="restart_alt" size={16} />
            Réinitialiser les données de démo
          </button>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-field p-2 text-left hover:bg-white/10"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white font-display text-small font-extrabold text-ink">{initials(user.name)}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-body font-semibold">{user.name}</span>
          <span className="block truncate text-small text-white/60">{ROLES[user.role].label}</span>
        </span>
        <Icon name="unfold_more" size={18} className="text-white/60" />
      </button>
      <p className="px-2 pt-2 text-tag text-white/40">Mode démonstration · données enregistrées dans ce navigateur</p>
    </div>
  );
}
