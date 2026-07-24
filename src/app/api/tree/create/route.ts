import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getServiceClient, getUserFromRequest } from "../../../../lib/supabase-server";

/**
 * POST /api/tree/create — atomically create a new tree owned by the caller.
 *
 * Why this is server-side instead of a client-side `.insert()`:
 *
 *   Our `trees_owner_insert` policy checks `owner_uid = auth.uid()::text`.
 *   That works iff PostgREST can verify the caller's JWT and surface its
 *   `sub` claim through `auth.uid()`. On projects where the new Supabase
 *   "JWT Signing Keys" feature is enabled but PostgREST's JWKS lookup is
 *   misconfigured (or the kid in the token isn't in the published JWKS),
 *   PostgREST falls back to treating the request as anonymous, `auth.uid()`
 *   returns NULL, and every authenticated write fails RLS — including tree
 *   creation, which deadlocks first-sign-in. This route side-steps that by
 *   validating the caller through the Supabase Auth API (which always works
 *   regardless of PostgREST config) and performing the writes with the
 *   service-role key (which bypasses RLS entirely).
 *
 * Body: { name: string }
 * Auth: bearer token required.
 *
 * Returns: { tree: TreeMeta } on success.
 */
export async function POST(request: NextRequest) {
  const caller = await getUserFromRequest(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const id = `tree_${nanoid(10)}`;

  // Ensure the auth user has a public.users row. The on-auth-user trigger
  // normally takes care of it, but doing an upsert here keeps the route
  // robust against the (rare) case where the trigger didn't fire — e.g.
  // legacy users created before the trigger existed.
  const { error: userUpsertError } = await supabase
    .from("users")
    .upsert(
      { uid: caller.uid, email: caller.email ?? "" },
      { onConflict: "uid", ignoreDuplicates: true }
    );
  if (userUpsertError) {
    console.error("user upsert failed", userUpsertError);
    return NextResponse.json({ error: "Failed to ensure user profile" }, { status: 500 });
  }

  const { data: treeRow, error: treeError } = await supabase
    .from("trees")
    .insert({ id, name, owner_uid: caller.uid, visibility: "private" })
    .select("id, name, owner_uid, visibility, created_at")
    .single<{
      id: string;
      name: string;
      owner_uid: string;
      visibility: string;
      created_at: string;
    }>();
  if (treeError || !treeRow) {
    console.error("tree insert failed", treeError);
    return NextResponse.json({ error: "Failed to create tree" }, { status: 500 });
  }

  // Owner becomes the first member. If this fails after the tree insert, the
  // tree exists but no membership row does — listMyTrees in the Supabase
  // provider joins through tree_members, so the orphan would be invisible to
  // the user, and a subsequent retry will create a new one. Acceptable.
  const { error: memberError } = await supabase
    .from("tree_members")
    .insert({ tree_id: id, uid: caller.uid, role: "owner" });
  if (memberError) {
    console.error("tree_members insert failed", memberError);
    // Best-effort rollback so we don't leave an orphan that listMyTrees can't see.
    await supabase.from("trees").delete().eq("id", id);
    return NextResponse.json({ error: "Failed to create membership" }, { status: 500 });
  }

  return NextResponse.json({
    tree: {
      id: treeRow.id,
      name: treeRow.name,
      ownerUid: treeRow.owner_uid,
      visibility: treeRow.visibility,
      createdAt: new Date(treeRow.created_at).getTime(),
    },
  });
}
