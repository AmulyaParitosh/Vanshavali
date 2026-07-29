import { NextRequest, NextResponse } from "next/server";
import { handle } from "../../../../lib/api";
import { getInviteDetail } from "../../../../services/invite-service";

/**
 * GET /api/invite/[id] — public invite detail (Spec 04 a1). No auth: the whole
 * invitation must be legible from the token alone, before any sign-in. Exposes
 * the tree summary + offered record + role only. noindex is set on the page.
 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    return NextResponse.json(await getInviteDetail(id));
  });
}
