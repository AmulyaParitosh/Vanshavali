import type { Person, DraftPerson, PersonName } from "../types/person";
import { diffFields } from "./writeState";
import { personFieldMap } from "./personChanges";

/**
 * Field-group merge for a stale save (Spec 13 flow 7). `detectConflict` works on
 * the flat, human-labelled field map (`personFieldMap`); this reconstructs a real
 * Person from a resolution over those same keys. `overlayPersonFields` starts from
 * the freshly-stored record — so the id, account link and root a save must never
 * touch come from there — and replaces only the chosen field groups with the
 * editor's version. `keys` is the set the user (and the safe-field pass) decided
 * to keep from "mine"; every other field keeps what is stored now.
 */

/** The flat field keys the editor changed relative to the record it opened. */
export function changedFieldKeys(base: DraftPerson, mine: DraftPerson): string[] {
  return diffFields(personFieldMap(base), personFieldMap(mine)).map((c) => c.field);
}

/**
 * The freshly-stored record with the given field groups taken from `mine`. Field
 * keys map to structure: Name→official_name, "Also known as"→aliases, Sex→sex,
 * Photograph→image, Life→events, Details→custom_fields. Absent optional values
 * clear the field (matches how the UI states absence rather than storing blanks).
 */
export function overlayPersonFields(
  stored: Person,
  mine: DraftPerson,
  keys: ReadonlySet<string>
): Person {
  const officialName = keys.has("Name")
    ? (mine.name?.official_name ?? "")
    : stored.name.official_name;
  const aliases = keys.has("Also known as") ? mine.name?.aliases : stored.name.aliases;
  const sex = keys.has("Sex") ? mine.sex : stored.sex;
  const imageUrl = keys.has("Photograph") ? mine.image_url : stored.image_url;
  const imagePath = keys.has("Photograph") ? mine.image_storage_path : stored.image_storage_path;
  const events = keys.has("Life") ? mine.events : stored.events;
  const custom = keys.has("Details") ? mine.custom_fields : stored.custom_fields;

  const cleanAliases = (aliases ?? []).filter((a) => a.trim().length > 0);
  const name: PersonName = {
    official_name: officialName,
    ...(cleanAliases.length ? { aliases: cleanAliases } : {}),
  };

  return {
    id: stored.id,
    name,
    sex,
    ...(stored.root ? { root: stored.root } : {}),
    ...(stored.userId ? { userId: stored.userId } : {}),
    ...(events && events.length ? { events } : {}),
    ...(custom && Object.keys(custom).length ? { custom_fields: custom } : {}),
    ...(imageUrl ? { image_url: imageUrl } : {}),
    ...(imagePath ? { image_storage_path: imagePath } : {}),
  };
}
