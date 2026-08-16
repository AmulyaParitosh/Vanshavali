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
  /**
   * A small copy of the same photograph, for the places that show a face at
   * 32–72px: the canvas cards, the descent line, search results. Written by the
   * upload alongside `image_url` (see `lib/images.ts`). Absent on records
   * uploaded before it existed — read it as `image_thumb_url ?? image_url`.
   */
  image_thumb_url?: string;
  image_storage_path?: string;
  /** Storage path of the thumbnail, so removing a photograph removes both. */
  image_thumb_storage_path?: string;
  userId?: string;
  /**
   * Optimistic-lock version from the `people.version` column (not part of the
   * stored `data`). The record panel reads it when opening a record and sends it
   * back on Save so a stale write is caught server-side (Spec 13 flow 7). Absent
   * on drafts that never came from the server.
   */
  version?: number;
  /**
   * Row `updated_at` in epoch ms (not part of the stored `data`). Powers the
   * Members list's "Updated" column (Spec 06). Absent on drafts.
   */
  updatedAt?: number;
}

/**
 * A Person being edited or created in a form. The `id` is unknown until save
 * for newly-created people; callers use `id ? update(person) : create(person)`
 * to discriminate.
 */
export type DraftPerson = Omit<Person, "id"> & { id?: string };
