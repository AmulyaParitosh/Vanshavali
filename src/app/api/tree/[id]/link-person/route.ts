import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../../lib/api";
import { linkUserToPerson } from "../../../../../services/tree-data-service";

/**
 * POST /api/tree/[id]/link-person — link the caller to a person in this tree.
 * The uid comes from the token, never the body, so a user can only link
 * themselves. Body: { personId: string }. Auth: bearer token required.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => null)) as { personId?: unknown } | null;
    const personId = typeof body?.personId === "string" ? body.personId : null;
    if (!personId) throw new HttpError("personId is required", 400);
    await linkUserToPerson(id, personId, caller.uid);
    return NextResponse.json({ ok: true });
  });
}
