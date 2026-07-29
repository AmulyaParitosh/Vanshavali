import { NextResponse } from "next/server";
import { getUserFromRequest } from "./supabase-server";
import { formatError } from "./formatError";

/**
 * Shared helpers for the `/api/*` route handlers: identity extraction and a
 * uniform error→response mapping. Every data route follows the same shape —
 * `handle(async () => { const caller = await requireCaller(req); … })` — so a
 * thrown `HttpError` becomes its status and anything else becomes a 500.
 *
 * Server-only (pulls the bearer token verification from supabase-server).
 */

/** An error carrying an HTTP status. Services throw these; routes map them. */
export class HttpError extends Error {
  readonly status: number;
  /** Extra JSON merged into the error response body — e.g. the fresh record on a 409 conflict. */
  readonly payload?: Record<string, unknown>;
  constructor(message: string, status: number, payload?: Record<string, unknown>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    if (payload) this.payload = payload;
  }
}

export interface Caller {
  uid: string;
  email: string | null;
}

/** Resolve the authenticated caller from the bearer token or throw 401. */
export async function requireCaller(request: Request): Promise<Caller> {
  const caller = await getUserFromRequest(request);
  if (!caller) throw new HttpError("Unauthorized", 401);
  return caller;
}

/** Map a thrown value to a JSON response: HttpError→its status, else 500. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message, ...(error.payload ?? {}) },
      { status: error.status }
    );
  }
  console.error("Unhandled route error", formatError(error));
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Run a route body, converting any throw into an error response. */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    return errorResponse(error);
  }
}
