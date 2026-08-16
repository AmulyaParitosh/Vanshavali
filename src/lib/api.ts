import { NextResponse } from "next/server";
import { brotliCompressSync, constants as zlibConstants, gzipSync } from "node:zlib";
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

/** Below this, compressing costs more CPU and latency than it saves bytes. */
const COMPRESS_ABOVE_BYTES = 1024;

/**
 * A JSON response, compressed when the caller can take it.
 *
 * Next's `compress` option covers pages and static files, not route handlers, so
 * every API response was going out as raw JSON — a tree of two thousand people
 * is half a megabyte of it. That JSON is extremely repetitive (the same keys on
 * every person), which is the case compression is best at, and it is the whole
 * of what a reader waits for on a slow connection.
 *
 * Brotli when offered, gzip otherwise, and neither for small bodies where the
 * work would not pay for itself. `Vary: Accept-Encoding` so a cache can't hand a
 * brotli body to a client that asked for none.
 */
export function json(data: unknown, request: Request, init?: ResponseInit): NextResponse {
  const body = Buffer.from(JSON.stringify(data));
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("vary", "Accept-Encoding");

  const accepted = request.headers.get("accept-encoding") ?? "";
  if (body.byteLength >= COMPRESS_ABOVE_BYTES) {
    if (accepted.includes("br")) {
      // Quality 4: most of brotli's win at a fraction of its cost, which is the
      // right trade for a body generated per request rather than cached.
      const out = brotliCompressSync(body, {
        params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 },
      });
      headers.set("content-encoding", "br");
      headers.set("content-length", String(out.byteLength));
      return new NextResponse(out as unknown as BodyInit, { ...init, headers });
    }
    if (accepted.includes("gzip")) {
      const out = gzipSync(body, { level: 6 });
      headers.set("content-encoding", "gzip");
      headers.set("content-length", String(out.byteLength));
      return new NextResponse(out as unknown as BodyInit, { ...init, headers });
    }
  }

  headers.set("content-length", String(body.byteLength));
  return new NextResponse(body as unknown as BodyInit, { ...init, headers });
}
