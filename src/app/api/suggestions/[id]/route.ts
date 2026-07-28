import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../lib/api";
import { updateSuggestionStatus } from "../../../../services/suggestion-service";
import { SUGGESTION_STATUS } from "../../../../constants";
import type { SuggestionStatus } from "../../../../types/suggestion";

/**
 * PATCH /api/suggestions/[id] — change a suggestion's status (site-admin only).
 * Auth: bearer token required.
 */

const STATUSES: readonly string[] = Object.values(SUGGESTION_STATUS);

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => null)) as { status?: unknown } | null;
    const status = body?.status;
    if (typeof status !== "string" || !STATUSES.includes(status)) {
      throw new HttpError("Invalid status.", 400);
    }
    await updateSuggestionStatus(caller.uid, id, status as SuggestionStatus);
    return NextResponse.json({ ok: true });
  });
}
