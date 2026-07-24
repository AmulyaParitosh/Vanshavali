/**
 * Shape errors for console logging when the runtime stash useful fields as
 * non-enumerable properties.
 *
 * `supabase-js` / PostgREST / fetch errors all do this: `console.error(error)`
 * prints `{}` because the message, code, details, and hint are not own
 * enumerable keys. Routing through this helper pulls the named fields out by
 * name so a logged error is actually diagnosable.
 *
 * Use everywhere we catch from a Supabase call or any fetch boundary:
 *
 *     console.error("context label:", formatError(error));
 */
export function formatError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") return { error };
  const e = error as Record<string, unknown>;
  return {
    message: e["message"] ?? (error instanceof Error ? error.message : undefined),
    code: e["code"],
    status: e["status"],
    statusCode: e["statusCode"],
    details: e["details"],
    hint: e["hint"],
    name: e["name"],
  };
}
