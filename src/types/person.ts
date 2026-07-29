export interface PersonName {
  official_name: string;
  aliases?: string[];
}

export interface PersonEvent {
  type: string;
  date?: string;
  place?: string;
}

export interface Person {
  id: string;
  name: PersonName;
  sex: "M" | "F";
  events?: PersonEvent[];
  custom_fields?: Record<string, string>;
  root?: boolean;
  image_url?: string;
  image_storage_path?: string;
  userId?: string;
  /**
   * Optimistic-lock version from the `people.version` column (not part of the
   * stored `data`). The record panel reads it when opening a record and sends it
   * back on Save so a stale write is caught server-side (Spec 13 flow 7). Absent
   * on drafts that never came from the server.
   */
  version?: number;
}

/**
 * A Person being edited or created in a form. The `id` is unknown until save
 * for newly-created people; callers use `id ? update(person) : create(person)`
 * to discriminate.
 */
export type DraftPerson = Omit<Person, "id"> & { id?: string };
