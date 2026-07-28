import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../../lib/api";
import { getTreeData, saveTreeData } from "../../../../../services/tree-data-service";
import type { TreeData } from "../../../../../services/types";

/**
 * GET  /api/tree/[id]/data — people + families for a tree (viewer+).
 * PUT  /api/tree/[id]/data — replace the tree's people + families (editor+),
 *   diffed + applied in one transaction by the service.
 * Auth: bearer token required.
 */

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    const data = await getTreeData(id, caller.uid);
    return NextResponse.json(data);
  });
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => null)) as TreeData | null;
    if (!body || !Array.isArray(body.people) || !Array.isArray(body.families)) {
      throw new HttpError("Invalid tree data payload.", 400);
    }
    await saveTreeData(id, caller.uid, body);
    return NextResponse.json({ ok: true });
  });
}
