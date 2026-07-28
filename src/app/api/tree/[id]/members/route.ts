import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller } from "../../../../../lib/api";
import { listMembers } from "../../../../../services/membership-service";

/**
 * GET /api/tree/[id]/members — all members of the tree (viewer+). Auth: bearer.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    return NextResponse.json(await listMembers(id, caller.uid));
  });
}
