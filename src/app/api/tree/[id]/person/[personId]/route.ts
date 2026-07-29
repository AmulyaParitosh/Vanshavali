import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../../../lib/api";
import { patchPerson } from "../../../../../../services/tree-data-service";
import type { Person } from "../../../../../../types/person";

/**
 * PATCH /api/tree/[id]/person/[personId] — save one person with optimistic
 * locking (Spec 13 flow 7). Body: { data: Person, baseVersion: number }. A stale
 * baseVersion returns 409 with { stored } (the fresh record) so the client can
 * merge; success returns { person }. Auth: bearer token; editor/keeper, or the
 * reader's own linked record (self-edit exception).
 */

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; personId: string }> }
) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id, personId } = await ctx.params;
    const body = (await request.json().catch(() => null)) as {
      data?: Person;
      baseVersion?: number;
    } | null;
    if (!body || typeof body.data !== "object" || body.data === null) {
      throw new HttpError("Invalid person payload.", 400);
    }
    if (typeof body.baseVersion !== "number") {
      throw new HttpError("A base version is required.", 400);
    }
    const person = await patchPerson(id, caller.uid, personId, body.data, body.baseVersion);
    return NextResponse.json({ person });
  });
}
