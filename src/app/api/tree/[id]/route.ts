import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller } from "../../../../lib/api";
import { deleteTree } from "../../../../services/tree-service";

/**
 * DELETE /api/tree/[id] — delete a tree (owner-only, enforced in the service).
 * Cascades to members/people/families/invites. Auth: bearer token.
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    await deleteTree(id, caller.uid);
    return NextResponse.json({ ok: true });
  });
}
