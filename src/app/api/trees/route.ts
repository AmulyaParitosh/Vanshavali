import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller } from "../../../lib/api";
import { listMyTrees } from "../../../services/tree-service";

/**
 * GET /api/trees — the caller's owned + member-only trees. Auth: bearer token.
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const caller = await requireCaller(request);
    return NextResponse.json(await listMyTrees(caller.uid));
  });
}
