-- ============================================================================
-- 0002_storage_policies.sql — Vanshavali storage bucket RLS
--
-- The Phase 1 storage scaffold ships with the `images` bucket as public-read
-- and unrestricted-write. This migration locks it down to match the per-tree
-- access model the table policies in 0001 already enforce:
--
--   - Anyone can read an image inside `trees/{treeId}/...` if they're a
--     member of that tree.
--   - Editors + owners of a tree can upload/replace/delete images under
--     `trees/{treeId}/...`.
--   - No one can touch paths outside the `trees/{treeId}/...` convention.
--
-- Path convention is enforced via regex against `storage.objects.name`. The
-- first capture group is the treeId.
--
-- HOW TO APPLY: this file is a REFERENCE, not directly runnable. On modern
-- Supabase projects `storage.objects` is owned by `supabase_storage_admin` and
-- can't be ALTERed or have policies created on it via either the `postgres`
-- direct-connection role (used by `npm run db:apply-policies`) OR the
-- Dashboard SQL editor. Both will fail with:
--
--     ERROR: 42501: must be owner of table objects
--
-- The supported path is the Storage Policies UI:
--
--   1. Supabase Dashboard → Storage → click the `images` bucket
--      (create the bucket first if it doesn't exist — set Public = true)
--   2. Policies tab → "New policy" → "For full customization"
--   3. Create four policies (one per operation), copying the USING / WITH
--      CHECK expressions below into the "Policy command" field:
--
--     • images_member_select   (SELECT) — body of `images_member_select`
--     • images_editor_insert   (INSERT) — body of `images_editor_insert`
--     • images_editor_update   (UPDATE) — body of `images_editor_update`
--     • images_editor_delete   (DELETE) — body of `images_editor_delete`
--
-- The script `npm run db:apply-policies` will detect this file's ownership
-- error and skip it with a one-line pointer to this comment, so the rest of
-- the migrations apply cleanly.
-- ============================================================================

-- Ensure the bucket exists. Kept `public = true` for v1 so the existing
-- SupabaseStorageProvider.getDownloadURL() (which returns getPublicUrl) keeps
-- working. URLs include the treeId/personId path so they're hard to guess.
-- Tightening to authenticated-read with signed URLs is tracked in BACKLOG.md
-- under "Asset / storage privacy" and lands when the storage provider also
-- switches to createSignedUrl.
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies so this file stays re-runnable.
DROP POLICY IF EXISTS images_member_select ON storage.objects;
DROP POLICY IF EXISTS images_editor_insert ON storage.objects;
DROP POLICY IF EXISTS images_editor_update ON storage.objects;
DROP POLICY IF EXISTS images_editor_delete ON storage.objects;

-- Members of the tree can read.
CREATE POLICY images_member_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'images'
    AND name LIKE 'trees/%'
    AND EXISTS (
      SELECT 1 FROM public.tree_members tm
      WHERE tm.tree_id = split_part(name, '/', 2)
        AND tm.uid = auth.uid()::text
    )
  );

-- Owners + editors of the tree can write.
CREATE POLICY images_editor_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND name LIKE 'trees/%'
    AND EXISTS (
      SELECT 1 FROM public.tree_members tm
      WHERE tm.tree_id = split_part(name, '/', 2)
        AND tm.uid = auth.uid()::text
        AND tm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY images_editor_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'images'
    AND name LIKE 'trees/%'
    AND EXISTS (
      SELECT 1 FROM public.tree_members tm
      WHERE tm.tree_id = split_part(name, '/', 2)
        AND tm.uid = auth.uid()::text
        AND tm.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    bucket_id = 'images'
    AND name LIKE 'trees/%'
    AND EXISTS (
      SELECT 1 FROM public.tree_members tm
      WHERE tm.tree_id = split_part(name, '/', 2)
        AND tm.uid = auth.uid()::text
        AND tm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY images_editor_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'images'
    AND name LIKE 'trees/%'
    AND EXISTS (
      SELECT 1 FROM public.tree_members tm
      WHERE tm.tree_id = split_part(name, '/', 2)
        AND tm.uid = auth.uid()::text
        AND tm.role IN ('owner', 'editor')
    )
  );
