import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller } from "../../../../lib/api";
import { listMyTreeCards } from "../../../../services/tree-service";

/**
 * GET /api/trees/summary — the caller's picker/switcher cards (Spec 03): every
 * tree they belong to, with their role, person count and first-four portraits.
 * Self-scoped from the bearer token. Auth: bearer.
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const caller = await requireCaller(request);
    return NextResponse.json({ trees: await listMyTreeCards(caller.uid) });
  });
}
