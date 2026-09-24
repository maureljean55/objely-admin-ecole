"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useSession } from "@/components/shell/AppShell";
import { useToast } from "@/components/ui/Toast";
import { changePassword, checkPassword, PASSWORD_MIN_LENGTH, type ChangePasswordResult } from "@/lib/auth";

const CONTROL =
  "h-11 w-full rounded-field border bg-white px-3 pr-11 text-body text-ink outline-none transition-[border-color,box-shadow] placeholder:text-mute focus:border-blue focus:shadow-[0_0_0_3px_rgba(31,99,224,0.2)]";

const ERRORS: Record<Exclude<ChangePasswordResult, { ok: true }>["reason"], string> = {
  not_available: "Le changement de mot de passe n'est pas disponible en démonstration.",
  wrong_current: "Le mot de passe actuel est incorrect.",
  same: "Le nouveau mot de passe doit être différent de l'actuel.",
  weak: `Le nouveau mot de passe est trop faible : ${PASSWORD_MIN_LENGTH} caractères minimum, avec au moins une lettre et un chiffre.`,
  session: "Votre session a expiré. Reconnectez-vous puis réessayez.",
  network: "Le changement a échoué. Vérifiez votre connexion et réessayez.",
};

function Rule({ ok, children }: { ok: boolean; children: string }) {
  return (
    <li className={`flex items-center gap-2 text-small ${ok ? "text-ok" : "text-mute"}`}>
      <Icon name={ok ? "check_circle" : "radio_button_unchecked"} size={16} fill={ok} />
      {children}
    </li>
  );
}

export function PasswordSection() {
  const { session, refresh } = useSession();
  const toast = useToast();
  const must = Boolean(session?.mustChangePassword);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const checks = checkPassword(next);
  const type = show ? "text" : "password";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const e: typeof errors = {};
    if (!current) e.current = "Saisissez votre mot de passe actuel.";
    if (!next) e.next = "Choisissez un nouveau mot de passe.";
    else if (!Object.values(checks).every(Boolean)) e.next = ERRORS.weak;
    else if (next === current) e.next = ERRORS.same;
    if (next && confirm !== next) e.confirm = "Les deux mots de passe ne sont pas identiques.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const result = await changePassword(current, next);
    setBusy(false);
    if (!result.ok) {
      setErrors(result.reason === "wrong_current" ? { current: ERRORS.wrong_current } : { form: ERRORS[result.reason] });
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setShow(false);
    await refresh();
    toast("Mot de passe modifié");
  }

  return (
    <section id="mot-de-passe" className={`scroll-mt-6 rounded-card border bg-white p-6 shadow-panel ${must ? "border-warn" : "border-line"}`}>
      <h2 className="mb-1 text-h2 text-ink">Mot de passe</h2>

      {must && (
        <p role="alert" className="mb-4 mt-3 flex items-start gap-3 rounded-field bg-warn-tint px-4 py-3 text-body text-warn">
          <Icon name="lock" size={22} fill className="mt-0.5" />
          <span>
            <strong className="font-semibold">Veuillez changer votre mot de passe.</strong> Le mot de passe que vous utilisez est provisoire : il a été généré à l&apos;inscription de votre établissement et il a pu être transmis par e-mail ou sur papier. Choisissez-en un nouveau que vous seul connaissez.
          </span>
        </p>
      )}

      <form onSubmit={submit} noValidate className="grid max-w-[460px] gap-4">
          <p className="text-body text-slate">{must ? "Saisissez le mot de passe provisoire, puis votre nouveau mot de passe." : "Changez-le régulièrement, et ne le partagez pas."}</p>

          {[
            { id: "current", label: "Mot de passe actuel", value: current, set: setCurrent, autoComplete: "current-password", error: errors.current },
            { id: "next", label: "Nouveau mot de passe", value: next, set: setNext, autoComplete: "new-password", error: errors.next },
            { id: "confirm", label: "Confirmer le nouveau mot de passe", value: confirm, set: setConfirm, autoComplete: "new-password", error: errors.confirm },
          ].map((f) => (
            <div key={f.id} className="flex flex-col gap-1.5">
              <label htmlFor={`pw-${f.id}`} className="text-small font-semibold text-ink">{f.label}</label>
              <div className="relative">
                <input
                  id={`pw-${f.id}`}
                  type={type}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  autoComplete={f.autoComplete}
                  aria-invalid={f.error ? true : undefined}
                  className={`${CONTROL} ${f.error ? "border-danger" : "border-line-strong"}`}
                />
                {f.id === "current" && (
                  <button
                    type="button"
                    aria-label={show ? "Masquer les mots de passe" : "Afficher les mots de passe"}
                    aria-pressed={show}
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-field text-slate hover:bg-black/5 hover:text-ink"
                  >
                    <Icon name={show ? "visibility_off" : "visibility"} size={20} />
                  </button>
                )}
              </div>
              {f.error && <p role="alert" className="text-small font-medium text-danger">{f.error}</p>}
              {f.id === "next" && (
                <ul className="mt-1 flex flex-col gap-1" aria-label="Règles du mot de passe">
                  <Rule ok={checks.length}>{`${PASSWORD_MIN_LENGTH} caractères minimum`}</Rule>
                  <Rule ok={checks.letter}>Au moins une lettre</Rule>
                  <Rule ok={checks.digit}>Au moins un chiffre</Rule>
                </ul>
              )}
            </div>
          ))}

          {errors.form && (
            <p role="alert" className="flex items-start gap-2 rounded-field bg-danger-tint px-3 py-2.5 text-small font-medium text-danger">
              <Icon name="error" size={18} fill className="mt-px" />
              {errors.form}
            </p>
          )}

          <div>
            <Button type="submit" disabled={busy} icon="lock_reset">{busy ? "Modification…" : "Changer le mot de passe"}</Button>
          </div>
      </form>
    </section>
  );
}
