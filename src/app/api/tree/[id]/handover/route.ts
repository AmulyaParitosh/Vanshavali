import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../../lib/api";
import { handOverKeeper } from "../../../../../services/membership-service";

/**
 * POST /api/tree/[id]/handover — hand the keeper role to another member
 * (Spec 11 a9). Keeper-only; the whole swap runs in one transaction in the
 * service. Body: { targetUid }. Auth: bearer.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => null)) as { targetUid?: unknown } | null;
    if (typeof body?.targetUid !== "string") {
      throw new HttpError("Choose a member to hand over to.", 400);
    }
    await handOverKeeper(id, caller.uid, body.targetUid);
    return NextResponse.json({ ok: true });
  });
}
