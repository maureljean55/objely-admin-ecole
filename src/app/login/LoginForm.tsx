"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { checkSession, safeNext, signIn, type SignInResult } from "@/lib/auth";

const MESSAGES: Record<Exclude<SignInResult, { ok: true }>["reason"], string> = {
  invalid: "E-mail ou mot de passe incorrect.",
  no_membership: "Ce compte n'est rattaché à aucun établissement. Demandez un accès à l'administrateur de votre établissement.",
  rate_limited: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
  network: "La connexion a échoué. Vérifiez votre connexion internet et réessayez.",
  not_configured: "Le service de connexion n'est pas configuré. Contactez Objely.",
};

const CONTROL =
  "h-12 w-full rounded-field border bg-white px-4 text-body text-ink outline-none transition-[border-color,box-shadow] placeholder:text-mute focus:border-blue focus:shadow-[0_0_0_3px_rgba(31,99,224,0.2)]";

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Already signed in: no reason to see this page.
  useEffect(() => {
    let cancelled = false;
    checkSession().then((s) => {
      if (s && !cancelled) router.replace(next);
    });
    return () => {
      cancelled = true;
    };
  }, [router, next]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = "Saisissez votre e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = "Cet e-mail n'est pas valide.";
    if (!password) nextErrors.password = "Saisissez votre mot de passe.";
    setErrors(nextErrors);
    if (nextErrors.email) return emailRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();

    setBusy(true);
    const result = await signIn(email, password);
    if (result.ok) {
      // A provisional password must be replaced: go straight to where that is done.
      router.replace(result.mustChangePassword ? "/parametres#mot-de-passe" : next);
      return;
    }
    setBusy(false);
    setFormError(MESSAGES[result.reason]);
    setPassword("");
    passwordRef.current?.focus();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.2fr)_minmax(460px,0.8fr)]">
      {/* Graphic panel, decorative only: the logo's two rings, very large, and dossier tickets like the ones the borne prints. */}
      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden lg:block"
        style={{ background: "linear-gradient(135deg, #0a4fb8 0%, #1f63e0 38%, #6d4be0 78%, #8d6cf3 100%)" }}
      >
        {/* Two interlocked rings, cropped by the panel edge */}
        <svg className="absolute -bottom-40 -right-48 w-[860px] opacity-100" viewBox="0 0 860 860" fill="none">
          <circle cx="330" cy="330" r="250" stroke="rgba(255,255,255,0.13)" strokeWidth="64" />
          <circle cx="560" cy="540" r="250" stroke="rgba(255,255,255,0.09)" strokeWidth="64" />
          <path d="M470 150 A250 250 0 0 1 560 290" stroke="rgba(255,255,255,0.22)" strokeWidth="64" strokeLinecap="butt" />
        </svg>
        {/* faint reference grid, like a register */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px)", backgroundSize: "100% 44px" }}
        />

        <div className="absolute left-14 top-14 z-10 max-w-[520px] text-white">
          <p className="font-display text-[26px] font-semibold leading-tight text-white/90">Objets perdus, objets retrouvés</p>
          <p className="mt-2 font-display text-[54px] font-extrabold leading-[1.02] tracking-tight">Votre vie scolaire, plus sereine.</p>
        </div>

        {/* The life of an object, in order: this sequence is real */}
        <ol className="absolute bottom-28 left-14 z-10 flex flex-col gap-3.5">
          {[
            ["01", "Déclaré sur la borne"],
            ["02", "Rangé à la vie scolaire"],
            ["03", "Rapproché de sa déclaration"],
            ["04", "Rendu à son propriétaire"],
          ].map(([n, label]) => (
            <li key={n} className="flex items-baseline gap-4 text-white">
              <span className="w-7 font-mono text-[15px] font-semibold text-white/60">{n}</span>
              <span className="text-[19px] font-medium">{label}</span>
            </li>
          ))}
        </ol>

        {/* Tickets */}
        <div className="absolute right-20 top-[350px] z-10 w-[300px]">
          <div className="ticket-float-b absolute -top-[92px] left-10 w-[280px] rotate-[6deg] rounded-[10px] bg-white shadow-[0_30px_60px_-18px_rgba(10,20,80,0.55)]">
            <div className="h-2.5 rounded-t-[10px] bg-[#8d6cf3]" />
            <div className="px-5 pb-4 pt-4">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a8499]">Objet trouvé</p>
              <p className="mt-1 font-mono text-[30px] font-semibold leading-none text-[#101a36]">OBJ-1047</p>
              <p className="mt-3 text-[17px] font-semibold text-[#101a36]">Trousseau de clés</p>
              <p className="text-[14px] text-[#525c72]">Rangé : Casier 1</p>
            </div>
          </div>

          <div className="ticket-float-a relative w-[300px] -rotate-[5deg] rounded-[10px] bg-white shadow-[0_34px_70px_-18px_rgba(10,20,80,0.6)]">
            <div className="h-2.5 rounded-t-[10px] bg-[#1f63e0]" />
            <div className="px-6 pt-5">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a8499]">Dossier n°</p>
              <p className="font-mono text-[40px] font-semibold leading-none tracking-tight text-[#101a36]">OBJ-1048</p>
            </div>
            <div className="mx-5 mt-4 border-t-2 border-dashed border-[#b9c0d0]" />
            <div className="px-6 pb-3 pt-4">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a8499]">Objet</p>
              <p className="text-[19px] font-semibold text-[#101a36]">Écouteurs sans fil noirs</p>
              <p className="mt-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a8499]">Trouvé</p>
              <p className="text-[17px] font-semibold text-[#101a36]">Cantine</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e5f4ea] px-3 py-1 text-[14px] font-semibold text-[#1f7a3e]">
                <span className="text-[15px]">✓</span> Rendu à son propriétaire
              </p>
            </div>
            <div className="flex h-9 items-stretch px-6 pb-4">
              {[2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 3, 2, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 2, 1, 3, 1].map((w, i) => (
                <span key={i} style={{ width: w * 2 }} className={i % 2 === 0 ? "bg-[#101a36]" : "bg-transparent"} />
              ))}
            </div>
          </div>
        </div>

        <p className="absolute bottom-10 left-14 z-10 text-body text-white/85">Perdu. Trouvé. Retrouvé.</p>
      </aside>

      <section className="flex flex-col justify-center bg-white px-8 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-[400px] animate-rise">
          <div className="mb-12 flex items-center gap-3">
            <Image src="/logo/objely-mark.png" alt="" width={56} height={49} priority className="h-[49px] w-[56px]" />
            <div className="leading-none">
              <p className="font-display text-[30px] font-extrabold tracking-tight text-ink">Objely</p>
              <p className="tag mt-1.5">École · Administration</p>
            </div>
          </div>

          <h1 className="text-title text-ink">Connexion</h1>
          <p className="mt-2 text-body-lg text-slate" style={{ fontSize: 17 }}>Connectez-vous avec le compte de votre établissement.</p>

          <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-small font-semibold text-ink">E-mail</label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                placeholder="prenom.nom@etablissement.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={`${CONTROL} ${errors.email ? "border-danger" : "border-line-strong"}`}
              />
              {errors.email && <p id="email-error" role="alert" className="text-small font-medium text-danger">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-small font-semibold text-ink">Mot de passe</label>
              <div className="relative">
                <input
                  id="password"
                  ref={passwordRef}
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={`${CONTROL} pr-12 ${errors.password ? "border-danger" : "border-line-strong"}`}
                />
                <button
                  type="button"
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={show}
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-field text-slate hover:bg-black/5 hover:text-ink"
                >
                  <Icon name={show ? "visibility_off" : "visibility"} size={20} />
                </button>
              </div>
              {errors.password && <p id="password-error" role="alert" className="text-small font-medium text-danger">{errors.password}</p>}
            </div>

            {formError && (
              <p role="alert" className="flex items-start gap-2 rounded-field bg-danger-tint px-3 py-2.5 text-small font-medium text-danger">
                <Icon name="error" size={18} fill className="mt-px" />
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="mt-1 flex h-12 items-center justify-center rounded-field bg-blue text-body font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="mt-10 border-t border-line pt-5 text-small text-slate">
            Pas encore d&apos;accès ? Il vous a été transmis par Objely à l&apos;inscription de votre établissement. Vous l&apos;avez perdu ? Contactez Objely.
          </p>
        </div>
      </section>
    </main>
  );
}
