// Turns database errors into sentences a school administrator can act on.
type DbError = { code?: string; message?: string; hint?: string } | null | undefined;

export function explain(error: DbError): string {
  if (!error) return "Une erreur est survenue.";
  const msg = error.message ?? "";
  if (msg.includes("last_admin")) return "Il doit rester au moins un administrateur actif.";
  if (msg.includes("use_restitute_object")) return "Un objet ne passe à « rendu » que par une restitution.";
  if (msg.includes("already_restituted")) return "Cet objet a déjà été rendu.";
  if (msg.includes("id_not_checked")) return "Confirmez la vérification d'identité avant de rendre l'objet.";
  if (msg.includes("already_paired")) return "Cette borne est déjà appairée.";
  if (msg.includes("kiosk_limit_reached")) return "Votre établissement a atteint le nombre maximum de bornes autorisé. Contactez Objely pour en ajouter.";
  if (msg.includes("code_taken")) return "Ce code est déjà utilisé par une autre borne. Choisissez-en un autre.";
  if (msg.includes("invalid_code_format")) return "Le code doit contenir 6 lettres ou chiffres.";
  if (msg.includes("code_unavailable")) return "Aucun code libre n'a pu être généré. Réessayez.";
  if (error.code === "42501" || /row-level security|permission denied/i.test(msg)) return "Votre rôle ne permet pas cette action.";
  if (error.code === "23505") return "Cet élément existe déjà.";
  if (error.code === "23514") return "Une des valeurs est hors des limites autorisées.";
  if (error.code === "PGRST301" || /jwt/i.test(msg)) return "Votre session a expiré. Reconnectez-vous.";
  if (/failed to fetch|network|load failed/i.test(msg)) return "Connexion impossible. Vérifiez votre connexion internet.";
  return "L'opération a échoué. Réessayez, ou contactez Objely si cela continue.";
}

export type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };
export const fail = (error: DbError): { ok: false; error: string } => ({ ok: false, error: explain(error) });
