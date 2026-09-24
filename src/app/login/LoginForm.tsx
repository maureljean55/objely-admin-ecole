"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { authIsReal, checkSession, safeNext, sendPasswordReset, signIn, type SignInResult } from "@/lib/auth";

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
  const real = authIsReal();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);

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

  async function forgot() {
    setFormError(null);
    setNotice(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrors({ email: "Saisissez d'abord votre e-mail, puis touchez « Mot de passe oublié »." });
      return emailRef.current?.focus();
    }
    setErrors({});
    if (!real) {
      setFormError(MESSAGES.not_configured);
      return;
    }
    await sendPasswordReset(email);
    setNotice("Si un compte existe pour cet e-mail, un lien pour choisir un nouveau mot de passe vient d'être envoyé.");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.2fr)_minmax(460px,0.8fr)]">
      {/* Visual: the Objely splash. Decorative only. */}
      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden lg:block"
        style={{ background: "linear-gradient(135deg, #0058bc 0%, #0070eb 35%, #7c6ff0 70%, #a19afd 100%)" }}
      >
        <div className="absolute left-14 top-14 z-10 max-w-[520px] text-white">
          <p className="font-display text-[26px] font-semibold leading-tight text-white/90">Objets perdus, objets retrouvés</p>
          <p className="mt-2 font-display text-[54px] font-extrabold leading-[1.02] tracking-tight">Votre vie scolaire, plus sereine.</p>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pt-28">
          <div className="relative">
            {/* soft rings behind the mascot */}
            <span className="radar-ping absolute inset-0 rounded-[64px] border border-white/40" />
            <span className="radar-ping absolute inset-0 rounded-[64px] border border-white/40" style={{ animationDelay: "1.5s" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/illustrations/mascot-tile.png"
              alt=""
              draggable={false}
              className="mascot-float relative w-[380px] rounded-[52px] shadow-[0_40px_80px_-20px_rgba(10,30,110,0.6)]"
            />
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
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="text-small font-semibold text-ink">Mot de passe</label>
                <button type="button" onClick={forgot} className="text-small font-semibold text-blue hover:underline">Mot de passe oublié ?</button>
              </div>
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
            {notice && (
              <p role="status" className="flex items-start gap-2 rounded-field bg-blue-tint px-3 py-2.5 text-small font-medium text-blue">
                <Icon name="info" size={18} fill className="mt-px" />
                {notice}
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
