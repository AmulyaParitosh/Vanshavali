import type { Person } from "../types/person";
import { TREE_CONFIG } from "../constants";
import { stringToColor } from "./colorUtils";

/**
 * Returns a deterministic placeholder image URL for a person, based on their
 * id (or name fallback). Used wherever `image_url` is missing.
 */
export function getPersonPlaceholderUrl(person: Person): string {
  const seed = person.id || person.name.official_name;
  const color = stringToColor(seed).substring(1);
  const text = person.name.official_name.substring(0, 2);
  return TREE_CONFIG.PLACEHOLDER_IMAGE_URL(color, text);
}
