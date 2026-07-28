import type { Person } from "../types/person";
import type { Family } from "../types/family";

/**
 * Generation helpers shared by the Members and Households tables (§06). Kept
 * out of the pages so both compute "which generation" the same way.
 */

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** Generation number → roman numeral (empty string for 0/undefined). */
export function roman(n: number | undefined): string {
  if (!n) return "";
  return ROMAN[n] ?? String(n);
}

/**
 * Generation number per person: the root is I, a spouse shares their partner's
 * generation, and a child is one below its parents' household.
 */
export function generationMap(people: Person[], families: Family[]): Map<string, number> {
  const gen = new Map<string, number>();
  const root = people.find((p) => p.root);
  if (!root) return gen;
  gen.set(root.id, 1);
  const queue = [root.id];
  while (queue.length) {
    const id = queue.shift()!;
    const g = gen.get(id)!;
    for (const f of families) {
      if (f.husband === id || f.wife === id) {
        const spouse = f.husband === id ? f.wife : f.husband;
        if (spouse && !gen.has(spouse)) {
          gen.set(spouse, g);
          queue.push(spouse);
        }
        for (const c of f.children) {
          if (!gen.has(c)) {
            gen.set(c, g + 1);
            queue.push(c);
          }
        }
      }
    }
  }
  return gen;
}

/** IDs born into the line (root + every child) — they carry the red ring. */
export function bornInLine(people: Person[], families: Family[]): Set<string> {
  const set = new Set<string>();
  const root = people.find((p) => p.root);
  if (root) set.add(root.id);
  for (const f of families) f.children.forEach((c) => set.add(c));
  return set;
}
