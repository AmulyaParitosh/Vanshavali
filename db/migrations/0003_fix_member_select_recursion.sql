-- ============================================================================
-- 0003_fix_member_select_recursion.sql
--
-- The original `tree_members_select` policy in 0001 self-referenced the same
-- table inside its USING clause:
--
--     EXISTS (SELECT 1 FROM tree_members self WHERE ...)
--
-- Postgres re-applies the row-level policy to every implicit read inside the
-- USING clause, so the policy triggers itself and the planner aborts with
-- "infinite recursion detected in policy for relation tree_members".
--
-- The symptom in the app is every Supabase query that touches tree_members —
-- listMyTrees, subscribeToTreeMembership, listTreeMembers — failing with that
-- error, which supabase-js surfaces as a non-enumerable object (logs as `{}`).
--
-- This migration replaces the recursive policy with a SECURITY DEFINER helper
-- function. The function runs as its owner (RLS-exempt for our purposes), so
-- its internal SELECT on tree_members doesn't re-trigger the policy.
--
-- 0001_initial.sql has been updated to match, so fresh installs get the right
-- shape on first apply. This file exists for already-deployed databases that
-- were created from the original 0001.
--
-- Apply via `npm run db:apply-policies`, or paste straight into the Supabase
-- SQL editor.
-- ============================================================================

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

DROP POLICY IF EXISTS tree_members_select ON tree_members;
CREATE POLICY tree_members_select ON tree_members
  FOR SELECT USING (
    public.is_tree_member(tree_members.tree_id, auth.uid()::text)
  );
