import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, getUserFromRequest } from "../../../../lib/supabase-server";

/**
 * POST /api/invite/accept — atomically accept a pending invitation.
 *
 * The invitee can't write tree_members under RLS (that's owner-only), so this
 * route uses the service-role client to perform the write after validating:
 *   1. The invite exists and is pending (not accepted/revoked/expired).
 *   2. The invite's email matches the calling user's verified email.
 *   3. No existing membership conflicts.
 *
 * Body: { inviteId: string }
 * Auth: bearer token required.
 *
 * Returns: { treeId: string, role: string } on success.
 */
export async function POST(request: NextRequest) {
  const caller = await getUserFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!caller.email) {
    return NextResponse.json(
      { error: "Your account doesn't have a verified email yet." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => null)) as { inviteId?: unknown } | null;
  const inviteId = typeof body?.inviteId === "string" ? body.inviteId : null;
  if (!inviteId) {
    return NextResponse.json({ error: "inviteId is required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: invite, error: inviteError } = await supabase
    .from("tree_invites")
    .select("id, tree_id, email, role, status, expires_at")
    .eq("id", inviteId)
    .maybeSingle<{
      id: string;
      tree_id: string;
      email: string;
      role: string;
      status: string;
      expires_at: string | null;
    }>();
  if (inviteError) {
    console.error("invite lookup failed", inviteError);
    return NextResponse.json({ error: "Invite lookup failed" }, { status: 500 });
  }
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: `Invite is ${invite.status}` }, { status: 409 });
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    // Mark it expired so it doesn't keep failing pending checks.
    await supabase.from("tree_invites").update({ status: "expired" }).eq("id", inviteId);
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  // The invite belongs to a specific email address. Anyone else who somehow
  // got the URL shouldn't be able to claim it.
  if (invite.email.toLowerCase() !== caller.email.toLowerCase()) {
    return NextResponse.json(
      { error: "This invite was sent to a different email address." },
      { status: 403 }
    );
  }

  // If the user is already a member of this tree, return their existing
  // membership rather than failing — treat accept as idempotent.
  const { data: existing } = await supabase
    .from("tree_members")
    .select("tree_id, role")
    .eq("tree_id", invite.tree_id)
    .eq("uid", caller.uid)
    .maybeSingle<{ tree_id: string; role: string }>();
  if (existing) {
    await supabase.from("tree_invites").update({ status: "accepted" }).eq("id", inviteId);
    return NextResponse.json({ treeId: existing.tree_id, role: existing.role });
  }

  // Insert the membership + mark the invite accepted. Not strictly atomic
  // across two statements; the worst case is membership exists + invite stays
  // pending, which the idempotent branch above will resolve on retry.
  const { error: memberError } = await supabase
    .from("tree_members")
    .insert({ tree_id: invite.tree_id, uid: caller.uid, role: invite.role });
  if (memberError) {
    console.error("membership insert failed", memberError);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("tree_invites")
    .update({ status: "accepted" })
    .eq("id", inviteId);
  if (updateError) {
    console.error("invite update failed", updateError);
    // Membership already created — don't fail the whole request.
  }

  return NextResponse.json({ treeId: invite.tree_id, role: invite.role });
}
