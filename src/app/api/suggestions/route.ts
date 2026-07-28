import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../lib/api";
import { listSuggestions, addSuggestion } from "../../../services/suggestion-service";
import { SUGGESTION_STATUS } from "../../../constants";
import type { SuggestionStatus } from "../../../types/suggestion";

/**
 * GET  /api/suggestions — the full feedback inbox (site-admin only).
 * POST /api/suggestions — add a suggestion (any signed-in user; uid from token).
 * Auth: bearer token required.
 */

const STATUSES: readonly string[] = Object.values(SUGGESTION_STATUS);

export async function GET(request: NextRequest) {
  return handle(async () => {
    const caller = await requireCaller(request);
    return NextResponse.json(await listSuggestions(caller.uid));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const body = (await request.json().catch(() => null)) as {
      message?: unknown;
      status?: unknown;
    } | null;
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) throw new HttpError("message is required", 400);
    const status =
      typeof body?.status === "string" && STATUSES.includes(body.status)
        ? (body.status as SuggestionStatus)
        : undefined;
    await addSuggestion(caller.uid, message, status);
    return NextResponse.json({ ok: true });
  });
}
