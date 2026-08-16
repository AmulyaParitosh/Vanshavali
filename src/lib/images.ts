/**
 * Photographs, sized for what they are actually used for.
 *
 * A phone photograph is a few thousand pixels on its longest edge and a few
 * megabytes on the wire. The app shows faces in circles of 32–72px, a dozen or
 * more at a time on the canvas and in search. Serving the original means the
 * browser downloads megabytes and then decodes millions of pixels to paint a
 * thumbnail — the cost falls on whoever opens the tree, every time, and it is
 * the single biggest thing between a person and their family's tree loading.
 *
 * So each upload is stored twice: a **display** copy big enough for the record
 * panel and any future full view, and a **thumb** big enough for the largest
 * avatar on a 2× screen. The maths is here, separate from the canvas work, so
 * the edge cases (already small, very tall, zero-sized) are testable.
 */

/** Longest edge of the stored display copy. */
export const DISPLAY_MAX = 1024;
/** Longest edge of the stored thumbnail: 72px avatar × 2 for retina, rounded up. */
export const THUMB_MAX = 192;

/** JPEG quality for both copies — visually clean on photographs, well short of lossless. */
const QUALITY = 0.82;

export interface Size {
  width: number;
  height: number;
}

/**
 * The size to store an image of `source` at, so its longest edge is at most
 * `max`. Never scales up — an image already smaller than the target is stored as
 * it is, because re-encoding it larger would cost bytes and add nothing.
 */
export function fitWithin(source: Size, max: number): Size {
  const { width, height } = source;
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= max) return { width: Math.round(width), height: Math.round(height) };
  const scale = max / longest;
  // At least 1px each way: a very wide, very short image must not round to zero.
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Whether an image of this size needs re-encoding at all for the given target. */
export function needsResize(source: Size, max: number): boolean {
  return Math.max(source.width, source.height) > max;
}

/**
 * Decode `file`, and return the display copy and the thumbnail as JPEGs.
 *
 * Browser-only: it needs a canvas to resample. Anything that fails — an image
 * format the browser can't decode, a canvas that won't produce a blob — falls
 * back to the original file for both copies, because a large photograph that
 * works beats a fast one that doesn't.
 */
export async function resizeForUpload(file: File): Promise<{ display: Blob; thumb: Blob }> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const source = { width: bitmap.width, height: bitmap.height };
      const [display, thumb] = await Promise.all([
        encodeAt(bitmap, fitWithin(source, DISPLAY_MAX)),
        encodeAt(bitmap, fitWithin(source, THUMB_MAX)),
      ]);
      return { display: display ?? file, thumb: thumb ?? display ?? file };
    } finally {
      bitmap.close();
    }
  } catch {
    return { display: file, thumb: file };
  }
}

/** Draw the bitmap at `size` and encode it, or null if the canvas won't play. */
async function encodeAt(bitmap: ImageBitmap, size: Size): Promise<Blob | null> {
  if (size.width <= 0 || size.height <= 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
}
