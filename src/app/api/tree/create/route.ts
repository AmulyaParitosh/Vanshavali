import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../lib/api";
import { createTree } from "../../../../services/tree-service";

/**
 * POST /api/tree/create — create a new tree owned by the caller, seeded with
 * the owner membership. The service does user-ensure + tree insert + owner
 * membership in one transaction.
 *
 * Body: { name: string }. Auth: bearer token required.
 * Returns: { tree: TreeMeta }.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) throw new HttpError("name is required", 400);
    const tree = await createTree(caller.uid, caller.email, name);
    return NextResponse.json({ tree });
  });
}
