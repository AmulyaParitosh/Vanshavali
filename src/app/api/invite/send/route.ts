import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, getUserFromRequest } from "../../../../lib/supabase-server";
import { sendInviteEmail } from "../../../../lib/resend";

/**
 * POST /api/invite/send — sends the invitation email for an already-created
 * invite row. The row creation happens via the regular RLS-gated client call
 * to `dataProvider.createInvite()`; this endpoint just handles the email.
 *
 * Body: { inviteId: string }
 * Auth: bearer token required; caller must be the tree owner.
 */
export async function POST(request: NextRequest) {
  const caller = await getUserFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { inviteId?: unknown } | null;
  const inviteId = typeof body?.inviteId === "string" ? body.inviteId : null;
  if (!inviteId) {
    return NextResponse.json({ error: "inviteId is required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Fetch the invite + the tree it belongs to + the inviting user's profile in
  // one round trip. The PostgREST query syntax `tree:trees(...)` does the join.
  const { data: invite, error: inviteError } = await supabase
    .from("tree_invites")
    .select("id, email, role, status, tree_id, invited_by, tree:trees(name, owner_uid)")
    .eq("id", inviteId)
    .maybeSingle<{
      id: string;
      email: string;
      role: string;
      status: string;
      tree_id: string;
      invited_by: string;
      tree: { name: string; owner_uid: string } | null;
    }>();
  if (inviteError) {
    console.error("invite lookup failed", inviteError);
    return NextResponse.json({ error: "Invite lookup failed" }, { status: 500 });
  }
  if (!invite || !invite.tree) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: `Invite is ${invite.status}; cannot send email` },
      { status: 409 }
    );
  }
  if (invite.tree.owner_uid !== caller.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Look up the inviter's display name for a nicer email subject.
  const { data: inviter } = await supabase
    .from("users")
    .select("name, email")
    .eq("uid", invite.invited_by)
    .maybeSingle<{ name: string | null; email: string }>();

  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const acceptUrl = `${origin}/invite/${invite.id}`;

  try {
    await sendInviteEmail({
      to: invite.email,
      treeName: invite.tree.name,
      inviterName: inviter?.name || inviter?.email || "A family member",
      role: invite.role,
      acceptUrl,
    });
  } catch (error: unknown) {
    console.error("Resend send failed", error);
    const message = error instanceof Error ? error.message : "Email send failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
