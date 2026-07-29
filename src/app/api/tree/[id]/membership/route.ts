import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller } from "../../../../../lib/api";
import { getMembership, leaveTree } from "../../../../../services/membership-service";

/**
 * GET    /api/tree/[id]/membership — the caller's own membership in this tree, or
 *   null if they're not a member.
 * DELETE /api/tree/[id]/membership — the caller leaves the tree (self-leave, a6):
 *   removes their own membership; the person record stays. A keeper can't leave.
 * Both self-scoped (uid from token). Auth: bearer.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    return NextResponse.json(await getMembership(id, caller.uid));
  });
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    await leaveTree(id, caller.uid);
    return NextResponse.json({ ok: true });
  });
}
