import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../../../lib/api";
import { updateMemberRole, removeMember } from "../../../../../../services/membership-service";
import { TREE_ROLES } from "../../../../../../constants";
import type { TreeRole } from "../../../../../../types/tree";

/**
 * PATCH  /api/tree/[id]/members/[uid] — change a member's role (owner-only).
 * DELETE /api/tree/[id]/members/[uid] — remove a member (owner-only).
 * The owner's own membership is protected in the service. Auth: bearer.
 */

const VALID_ROLES: readonly string[] = Object.values(TREE_ROLES);

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; uid: string }> }
) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id, uid } = await ctx.params;
    const body = (await request.json().catch(() => null)) as { role?: unknown } | null;
    const role = body?.role;
    if (typeof role !== "string" || !VALID_ROLES.includes(role)) {
      throw new HttpError("Invalid role.", 400);
    }
    await updateMemberRole(id, caller.uid, uid, role as TreeRole);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; uid: string }> }
) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id, uid } = await ctx.params;
    await removeMember(id, caller.uid, uid);
    return NextResponse.json({ ok: true });
  });
}
