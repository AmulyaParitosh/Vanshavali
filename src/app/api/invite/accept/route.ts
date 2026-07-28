import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../lib/api";
import { acceptInvite } from "../../../../services/invite-service";

/**
 * POST /api/invite/accept — accept a pending invitation. Validates the invite
 * is pending, unexpired, and addressed to the caller's email, then creates the
 * membership and marks the invite accepted (atomically). Idempotent if the
 * caller is already a member.
 *
 * Body: { inviteId: string }. Auth: bearer token required.
 * Returns: { treeId, role }.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const body = (await request.json().catch(() => null)) as { inviteId?: unknown } | null;
    const inviteId = typeof body?.inviteId === "string" ? body.inviteId : null;
    if (!inviteId) throw new HttpError("inviteId is required", 400);
    return NextResponse.json(await acceptInvite(inviteId, caller.uid, caller.email));
  });
}
