import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../lib/api";
import { updateOwnRecord } from "../../../../services/user-record-service";
import { ownFactsOf } from "../../../../lib/onerecord";
import type { Person } from "../../../../types/person";

/**
 * PUT /api/user/record — the one-record propagation (Spec 12 a5). Body: the edited
 * Person; the server takes only its OWN facts (name/sex/aliases/life/details/photo)
 * and writes them to every row linked to the caller, across all their trees. Self-
 * scoped: the uid comes from the token, so a user can only edit their own record
 * (a4). Returns { trees } — how many trees were updated.
 */
export async function PUT(request: NextRequest) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const body = (await request.json().catch(() => null)) as { person?: Person } | null;
    if (!body || typeof body.person !== "object" || body.person === null) {
      throw new HttpError("Invalid record payload.", 400);
    }
    const result = await updateOwnRecord(caller.uid, ownFactsOf(body.person));
    return NextResponse.json({ ok: true, ...result });
  });
}
