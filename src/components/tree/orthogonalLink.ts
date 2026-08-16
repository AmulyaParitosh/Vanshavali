/**
 * Spec 05 g7 — the lineage thread between generations is orthogonal, never a
 * bezier: from the parent pill's centre it drops a fixed distance, runs across to
 * the child's column, then drops to the child, with small quadratic arc corners
 * (6px). A child sharing the parent's column is a plain vertical. Children connect
 * to the parent pill's centre (a1).
 */

export interface LinkPoint {
  x: number;
  y: number;
}

export function orthogonalLinkPath(
  source: LinkPoint,
  target: LinkPoint,
  opts?: { drop?: number; corner?: number }
): string {
  const drop = opts?.drop ?? 40;
  const r = opts?.corner ?? 6;
  const { x: sx, y: sy } = source;
  const { x: tx, y: ty } = target;
  const busY = sy + drop;

  // Straight down when the child is in the parent's column, or the bus would sit
  // at/below the child (degenerate elbow).
  if (Math.abs(tx - sx) < 0.5 || busY >= ty) {
    return `M ${sx},${sy} L ${sx},${ty}`;
  }

  const dx = tx > sx ? 1 : -1;
  // Clamp the corner radius to the available segment lengths.
  const cr = Math.min(r, Math.abs(tx - sx) / 2, (busY - sy) / 2, ty - busY);

  return [
    `M ${sx},${sy}`,
    `L ${sx},${busY - cr}`,
    `Q ${sx},${busY} ${sx + dx * cr},${busY}`,
    `L ${tx - dx * cr},${busY}`,
    `Q ${tx},${busY} ${tx},${busY + cr}`,
    `L ${tx},${ty}`,
  ].join(" ");
}

/**
 * The same joinery transposed for the left→right view: out of the parent card's
 * right edge, across to a shared bus column, down/up to the child's row, then in
 * to the child's left edge. Mirrors {@link orthogonalLinkPath} exactly, so both
 * orientations draw the same kind of elbow.
 */
export function orthogonalLinkPathH(
  source: LinkPoint,
  target: LinkPoint,
  opts?: { run?: number; corner?: number }
): string {
  const run = opts?.run ?? 40;
  const r = opts?.corner ?? 10;
  const { x: sx, y: sy } = source;
  const { x: tx, y: ty } = target;
  const busX = sx + run;

  // Straight across when the child shares the parent's row, or the bus would sit
  // at/past the child (degenerate elbow).
  if (Math.abs(ty - sy) < 0.5 || busX >= tx) {
    return `M ${sx},${sy} L ${tx},${ty}`;
  }

  const dy = ty > sy ? 1 : -1;
  const cr = Math.min(r, Math.abs(ty - sy) / 2, (busX - sx) / 2, tx - busX);

  return [
    `M ${sx},${sy}`,
    `L ${busX - cr},${sy}`,
    `Q ${busX},${sy} ${busX},${sy + dy * cr}`,
    `L ${busX},${ty - dy * cr}`,
    `Q ${busX},${ty} ${busX + cr},${ty}`,
    `L ${tx},${ty}`,
  ].join(" ");
}
