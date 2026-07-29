/** Marriage facts for a household (Spec 08) — both optional, free-form date. */
export interface Marriage {
  date?: string;
  place?: string;
}

export interface Family {
  id: string;
  husband?: string; // Person ID (Male)
  wife?: string; // Person ID (Female)
  children: string[]; // Array of Person IDs
  /** When/where this couple married (Spec 08). Absent until recorded. */
  marriage?: Marriage;
}
