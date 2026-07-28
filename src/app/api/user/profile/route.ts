import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../lib/api";
import { getProfile, upsertProfile } from "../../../../services/user-service";
import type { UserProfile } from "../../../../services/types";

/**
 * GET  /api/user/profile — the caller's own profile (name/email/photo), or null.
 * POST /api/user/profile — create/update the caller's own profile.
 * Both are self-scoped: the uid comes from the token, never the body.
 */

export async function GET(request: NextRequest) {
  return handle(async () => {
    const caller = await requireCaller(request);
    return NextResponse.json(await getProfile(caller.uid));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const body = (await request.json().catch(() => null)) as Partial<UserProfile> | null;
    if (!body || typeof body !== "object") {
      throw new HttpError("Invalid profile payload.", 400);
    }
    await upsertProfile(caller.uid, {
      email: body.email ?? caller.email,
      name: body.name ?? null,
      photoURL: body.photoURL ?? null,
    });
    return NextResponse.json({ ok: true });
  });
}
