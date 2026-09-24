import { fold } from "./format";
import type { Declaration, StoredObject } from "./types";

export type Match = { declaration: Declaration; object: StoredObject; score: number; reasons: string[] };

const STOP = new Set(["le", "la", "les", "un", "une", "des", "de", "du", "et", "en", "au", "aux", "avec", "sans", "sur", "dans", "pour", "mon", "ma", "mes"]);

const tokens = (s: string) =>
  new Set(
    fold(s)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );

/**
 * Scores how well a stock object fits a lost-object declaration (0-100).
 * A suggestion only: a person always confirms it, and the owner still has to describe the object at pick-up.
 */
export function scoreMatch(declaration: Declaration, object: StoredObject): Match {
  const reasons: string[] = [];
  let score = 0;

  if (declaration.category === object.category) {
    score += declaration.category === "autre" ? 20 : 45;
    reasons.push("Même catégorie");
  }

  const a = tokens(`${declaration.objectName} ${declaration.description}`);
  const b = tokens(`${object.name} ${object.description}`);
  const shared = [...a].filter((t) => b.has(t));
  if (shared.length > 0) {
    score += Math.min(45, shared.length * 15);
    reasons.push(`Mots communs : ${shared.slice(0, 4).join(", ")}`);
  }

  // Without a single word in common there is nothing to go on beyond the category.
  if (shared.length === 0) score = Math.min(score, 40);

  if (declaration.location && fold(declaration.location) === fold(object.foundAt) && shared.length > 0) {
    score += 10;
    reasons.push("Même lieu");
  }

  // Capped: a suggestion is never a certainty, the owner still has to describe the object.
  return { declaration, object, score: Math.min(95, score), reasons };
}

export const MIN_MATCH_SCORE = 60;

export function findMatches(declarations: Declaration[], objects: StoredObject[]): Match[] {
  const open = declarations.filter((d) => d.kind === "perdu" && d.status !== "cloturee");
  const inStock = objects.filter((o) => o.status === "en_stock");
  return open
    .flatMap((d) => inStock.map((o) => scoreMatch(d, o)))
    .filter((m) => m.score >= MIN_MATCH_SCORE)
    .sort((x, y) => y.score - x.score);
}
