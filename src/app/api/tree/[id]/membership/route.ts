import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller } from "../../../../../lib/api";
import { getMembership } from "../../../../../services/membership-service";

/**
 * GET /api/tree/[id]/membership — the caller's own membership in this tree, or
 * null if they're not a member. Self-scoped (uid from token). Auth: bearer.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    return NextResponse.json(await getMembership(id, caller.uid));
  });
}
