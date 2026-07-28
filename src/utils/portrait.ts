/**
 * Portrait helpers shared by the tree node and the record inspector (§01).
 * The eight tints are assigned per person from a stable hash of the id and
 * never re-picked, so the same face keeps the same colour everywhere.
 */

const TINTS = [
  "var(--tint-1)",
  "var(--tint-2)",
  "var(--tint-3)",
  "var(--tint-4)",
  "var(--tint-5)",
  "var(--tint-6)",
  "var(--tint-7)",
  "var(--tint-8)",
];

export function portraitTint(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length]!;
}

/** First one or two graphemes of the primary name — white initials on the tint. */
export function personInitials(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return Array.from(first).slice(0, 2).join("");
}
