-- ============================================================================
-- 0004_fix_cross_table_recursion.sql
--
-- 0003 broke the self-recursion on `tree_members` by routing the membership
-- check through a SECURITY DEFINER function. But the policies on `trees`,
-- `tree_members` (the FOR ALL owner-write), `people`, `families`, and
-- `tree_invites` still do plain `EXISTS (SELECT … FROM other_table …)`
-- subqueries, which trigger each other's policies and trip a different
-- recursion:
--
--     infinite recursion detected in policy for relation "trees"
--
-- The chain that produces it:
--   1. Query `trees` → `trees_member_select` fires
--   2. Its EXISTS subquery hits `tree_members`
--   3. `tree_members_owner_write` is FOR ALL → applies to that SELECT too
--   4. Its EXISTS subquery hits `trees` again → step 1
--
-- Postgres detects the loop and aborts.
--
-- Fix: wrap every cross-table membership / ownership / editor check in a
-- SECURITY DEFINER helper. The helpers run as the function owner (postgres,
-- which has BYPASSRLS on Supabase), so their internal SELECTs don't re-fire
-- the calling table's policy.
--
-- 0001_initial.sql is updated to match for fresh installs. This file is
-- idempotent — safe to run on top of any earlier state.
-- ============================================================================

-- ---------- helpers ----------

CREATE OR REPLACE FUNCTION public.is_tree_member(p_tree_id text, p_uid text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tree_members
    WHERE tree_id = p_tree_id AND uid = p_uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tree_owner(p_tree_id text, p_uid text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trees
    WHERE id = p_tree_id AND owner_uid = p_uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tree_editor(p_tree_id text, p_uid text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tree_members
    WHERE tree_id = p_tree_id AND uid = p_uid AND role IN ('owner', 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_email(p_uid text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email FROM public.users WHERE uid = p_uid;
$$;

-- ---------- trees ----------

DROP POLICY IF EXISTS trees_member_select ON trees;
CREATE POLICY trees_member_select ON trees
  FOR SELECT USING (public.is_tree_member(id, auth.uid()::text));

-- ---------- tree_members ----------

DROP POLICY IF EXISTS tree_members_select ON tree_members;
CREATE POLICY tree_members_select ON tree_members
  FOR SELECT USING (public.is_tree_member(tree_id, auth.uid()::text));

DROP POLICY IF EXISTS tree_members_owner_write ON tree_members;
CREATE POLICY tree_members_owner_write ON tree_members
  FOR ALL
  USING (public.is_tree_owner(tree_id, auth.uid()::text))
  WITH CHECK (public.is_tree_owner(tree_id, auth.uid()::text));

-- ---------- people ----------

DROP POLICY IF EXISTS people_member_select ON people;
CREATE POLICY people_member_select ON people
  FOR SELECT USING (public.is_tree_member(tree_id, auth.uid()::text));

DROP POLICY IF EXISTS people_editor_write ON people;
CREATE POLICY people_editor_write ON people
  FOR ALL
  USING (public.is_tree_editor(tree_id, auth.uid()::text))
  WITH CHECK (public.is_tree_editor(tree_id, auth.uid()::text));

-- ---------- families ----------

DROP POLICY IF EXISTS families_member_select ON families;
CREATE POLICY families_member_select ON families
  FOR SELECT USING (public.is_tree_member(tree_id, auth.uid()::text));

DROP POLICY IF EXISTS families_editor_write ON families;
CREATE POLICY families_editor_write ON families
  FOR ALL
  USING (public.is_tree_editor(tree_id, auth.uid()::text))
  WITH CHECK (public.is_tree_editor(tree_id, auth.uid()::text));

-- ---------- tree_invites ----------

DROP POLICY IF EXISTS tree_invites_owner_select ON tree_invites;
CREATE POLICY tree_invites_owner_select ON tree_invites
  FOR SELECT USING (public.is_tree_owner(tree_id, auth.uid()::text));

DROP POLICY IF EXISTS tree_invites_invitee_select ON tree_invites;
CREATE POLICY tree_invites_invitee_select ON tree_invites
  FOR SELECT USING (email = public.user_email(auth.uid()::text));

DROP POLICY IF EXISTS tree_invites_owner_write ON tree_invites;
CREATE POLICY tree_invites_owner_write ON tree_invites
  FOR ALL
  USING (public.is_tree_owner(tree_id, auth.uid()::text))
  WITH CHECK (public.is_tree_owner(tree_id, auth.uid()::text));
