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

  // Index the households each person is a partner in, once. The walk used to
  // scan every family for every person it reached, which is fine for a dozen
  // people and quadratic for a thousand.
  const byPartner = new Map<string, Family[]>();
  for (const f of families) {
    for (const id of [f.husband, f.wife]) {
      if (!id) continue;
      const list = byPartner.get(id);
      if (list) list.push(f);
      else byPartner.set(id, [f]);
    }
  }

  gen.set(root.id, 1);
  // An array read by a moving head, not shift(): shift() re-indexes the queue on
  // every step, which is the second quadratic factor.
  const queue = [root.id];
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]!;
    const g = gen.get(id)!;
    for (const f of byPartner.get(id) ?? []) {
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
  return gen;
}

/** One generation as the rail's "Jump to generation" list renders it (Spec 05 g8). */
export interface GenerationSummary {
  /** 1-indexed depth (root generation = 1). */
  depth: number;
  /** People in this generation — the count shown at the row's right. */
  count: number;
  /** Year span "1931—2018" (or a single year, or "" when no dates are known). */
  span: string;
}

/**
 * People grouped by generation with a year span and count per row — the rail's
 * generation list (Spec 05 g8). The span runs from the earliest to the latest
 * year (birth or death) recorded in the generation.
 */
export function generationSummaries(people: Person[], families: Family[]): GenerationSummary[] {
  const gen = generationMap(people, families);
  const byGen = new Map<number, Person[]>();
  for (const p of people) {
    const g = gen.get(p.id);
    if (g === undefined) continue;
    const bucket = byGen.get(g) ?? [];
    bucket.push(p);
    byGen.set(g, bucket);
  }
  return [...byGen.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([depth, ppl]) => {
      const years: number[] = [];
      for (const p of ppl) {
        for (const e of p.events ?? []) {
          const y = e.date?.match(/\d{4}/)?.[0];
          if (y) years.push(Number(y));
        }
      }
      const min = years.length ? Math.min(...years) : null;
      const max = years.length ? Math.max(...years) : null;
      const span = min === null ? "" : min === max ? `${min}` : `${min}—${max}`;
      return { depth, count: ppl.length, span };
    });
}

/** IDs born into the line (root + every child) — they carry the red ring. */
export function bornInLine(people: Person[], families: Family[]): Set<string> {
  const set = new Set<string>();
  const root = people.find((p) => p.root);
  if (root) set.add(root.id);
  for (const f of families) f.children.forEach((c) => set.add(c));
  return set;
}
