import React from "react";
import type { Person } from "../types/person";
import { portraitTint, personInitials } from "../utils/portrait";

/** The portrait sizes in the design system, and their pixel box (§01, globals.css). */
const SIZES = {
  table: 40,
  descent: 32,
  hero: 56,
  node: 58,
  panel: 72,
  who: 44,
} as const;

export type PortraitSize = keyof typeof SIZES;

interface PortraitProps {
  person: Person | undefined;
  /** Which of the design system's portrait sizes to render. */
  size: PortraitSize;
  /** Red ring (born into this line) or marigold (married in). */
  married?: boolean;
  /** Extra classes for a caller's own variant. */
  className?: string;
  /**
   * True for a portrait that is on screen the moment the page paints — the one
   * in the record panel header, say. Everything else loads lazily.
   */
  eager?: boolean;
}

/**
 * A person's face: their photograph, or their initials on the tint assigned to
 * their id. One implementation, because every surface that shows a face had
 * grown its own and they were drifting — and because the loading rules below
 * only help if they are in one place.
 *
 * Three things every one of these images needs, and none of the hand-rolled
 * copies had:
 *
 * - **The thumbnail, not the original.** Uploads store a small copy for exactly
 *   this (see `lib/images.ts`); a canvas showing forty faces would otherwise
 *   pull forty full-size photographs. Records written before that existed have
 *   only the original, so it is used as the fallback.
 * - **`loading="lazy"` and `decoding="async"`.** A tree's worth of faces should
 *   not be fetched or decoded on the main thread before the page is usable; the
 *   browser will do both when the face is near the viewport, off-thread.
 * - **Intrinsic `width`/`height`.** Without them the circle has no size until
 *   the image arrives, so the row it sits in reflows when it does.
 */
export default function Portrait({
  person,
  size,
  married = false,
  className,
  eager = false,
}: PortraitProps) {
  const px = SIZES[size];
  const cls = ["portrait", `portrait--${size}`, married ? "portrait--married" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  if (!person) return <span className={cls} aria-hidden="true" />;

  const src = person.image_thumb_url ?? person.image_url;
  return (
    <span
      className={cls}
      style={{ background: portraitTint(person.id) }}
      aria-hidden="true"
      title={person.name.official_name}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="portrait-img"
          width={px}
          height={px}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
        />
      ) : (
        personInitials(person.name.official_name)
      )}
    </span>
  );
}
