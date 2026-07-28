import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller } from "../../../../../../lib/api";
import { revokeInvite } from "../../../../../../services/invite-service";

/**
 * DELETE /api/tree/[id]/invites/[inviteId] — revoke a pending invite
 * (owner-only; marks status 'revoked', not a hard delete). Auth: bearer token.
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; inviteId: string }> }
) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id, inviteId } = await ctx.params;
    await revokeInvite(id, caller.uid, inviteId);
    return NextResponse.json({ ok: true });
  });
}
