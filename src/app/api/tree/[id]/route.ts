import { NextRequest, NextResponse } from "next/server";
import { handle, requireCaller, HttpError } from "../../../../lib/api";
import { deleteTree, updateTreeSettings } from "../../../../services/tree-service";
import type { TreeSettingsPatch, NameOrder, InvitableTreeRole } from "../../../../types/tree";

/**
 * DELETE /api/tree/[id] — delete a tree (owner-only, enforced in the service).
 * Cascades to members/people/families/invites. Auth: bearer token.
 */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    await deleteTree(id, caller.uid);
    return NextResponse.json({ ok: true });
  });
}

const NAME_ORDERS: NameOrder[] = ["devanagari", "latin", "latin-only"];
const INVITE_ROLES: InvitableTreeRole[] = ["editor", "viewer"];

/** Pull only the known, well-typed settings fields off an untrusted body. */
function parsePatch(body: unknown): TreeSettingsPatch {
  if (!body || typeof body !== "object") throw new HttpError("Invalid body", 400);
  const b = body as Record<string, unknown>;
  const patch: TreeSettingsPatch = {};
  if (typeof b.name === "string") patch.name = b.name;
  if (typeof b.place === "string") patch.place = b.place;
  if (typeof b.nameOrder === "string" && NAME_ORDERS.includes(b.nameOrder as NameOrder))
    patch.nameOrder = b.nameOrder as NameOrder;
  if (
    typeof b.defaultInviteRole === "string" &&
    INVITE_ROLES.includes(b.defaultInviteRole as InvitableTreeRole)
  )
    patch.defaultInviteRole = b.defaultInviteRole as InvitableTreeRole;
  if (typeof b.readersSeeDates === "boolean") patch.readersSeeDates = b.readersSeeDates;
  if (typeof b.allowOwnChildren === "boolean") patch.allowOwnChildren = b.allowOwnChildren;
  return patch;
}

/**
 * PATCH /api/tree/[id] — keeper-only settings edit (Spec 11). One patch per
 * card; the service enforces keeper + validates. Auth: bearer token.
 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const caller = await requireCaller(request);
    const { id } = await ctx.params;
    const patch = parsePatch(await request.json());
    const tree = await updateTreeSettings(id, caller.uid, patch);
    return NextResponse.json({ tree });
  });
}
