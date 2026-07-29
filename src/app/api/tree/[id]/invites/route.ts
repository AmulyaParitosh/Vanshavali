import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../../lib/api";
import { listInvites, createInvite } from "../../../../../services/invite-service";
import { INVITABLE_ROLES } from "../../../../../constants";
import type { InvitableTreeRole } from "../../../../../types/tree";

/**
 * GET  /api/tree/[id]/invites — invites for a tree (owner-only).
 * POST /api/tree/[id]/invites — create an invite + send its email (owner-only).
 *   Body: { email, role }. Returns { invite, emailError? } — a non-empty
 *   emailError means the row was created but the email failed.
 * Auth: bearer token required.
 */

const INVITABLE: readonly string[] = INVITABLE_ROLES;

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    return NextResponse.json(await listInvites(id, caller.uid));
  });
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      role?: unknown;
      personId?: unknown;
    } | null;
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const role = body?.role;
    const personId = typeof body?.personId === "string" ? body.personId : null;
    if (!email) throw new HttpError("email is required", 400);
    if (typeof role !== "string" || !INVITABLE.includes(role)) {
      throw new HttpError("Invalid role.", 400);
    }
    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const result = await createInvite(
      id,
      caller.uid,
      email,
      role as InvitableTreeRole,
      origin,
      personId
    );
    return NextResponse.json(result);
  });
}
