-- ============================================================================
-- 0001_initial.sql — Vanshavali multi-tenant schema (single source of truth)
--
-- Defines the full initial schema: tables, indexes, the Row-Level Security
-- policies that enforce per-tree access, triggers, and helper functions.
-- Without the policies the anon key would let any authenticated user read or
-- write any tree.
--
-- Apply via `npm run db:setup` (which runs this + the later migrations, then
-- the grants/realtime/storage extras). Schema changes are made by adding a new
-- `db/migrations/000N_*.sql` file — there is no ORM/codegen layer.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  uid         text PRIMARY KEY,
  email       text NOT NULL,
  name        text,
  photo_url   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trees (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  owner_uid   text NOT NULL REFERENCES users(uid) ON DELETE RESTRICT,
  visibility  text NOT NULL DEFAULT 'private',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trees_owner_idx ON trees(owner_uid);

CREATE TABLE IF NOT EXISTS tree_members (
  tree_id    text NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  uid        text NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('owner','editor','viewer')),
  person_id  text,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tree_id, uid)
);
CREATE INDEX IF NOT EXISTS tree_members_uid_idx ON tree_members(uid);

CREATE TABLE IF NOT EXISTS people (
  id          text PRIMARY KEY,
  tree_id     text NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  data        jsonb NOT NULL,
  user_id     text REFERENCES users(uid) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS people_tree_idx ON people(tree_id);
CREATE UNIQUE INDEX IF NOT EXISTS people_tree_user_unique
  ON people(tree_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS people_tree_root_unique
  ON people(tree_id) WHERE (data->>'root')::boolean = true;

CREATE TABLE IF NOT EXISTS families (
  id          text PRIMARY KEY,
  tree_id     text NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  husband_id  text REFERENCES people(id) ON DELETE SET NULL,
  wife_id     text REFERENCES people(id) ON DELETE SET NULL,
  children    text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS families_tree_idx ON families(tree_id);

CREATE TABLE IF NOT EXISTS tree_invites (
  id          text PRIMARY KEY,
  tree_id     text NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('editor','viewer')),
  invited_by  text NOT NULL REFERENCES users(uid) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','accepted','revoked','expired')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz
);
CREATE INDEX IF NOT EXISTS tree_invites_tree_idx ON tree_invites(tree_id);
CREATE INDEX IF NOT EXISTS tree_invites_email_idx ON tree_invites(email);

CREATE TABLE IF NOT EXISTS suggestions (
  id          text PRIMARY KEY,
  uid         text NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  message     text NOT NULL,
  status      text NOT NULL DEFAULT 'unread'
              CHECK (status IN ('unread','read','archived','prioritized')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Trigger: create a `users` row whenever a new Supabase auth.users entry
-- appears, so the rest of our schema has a row to reference.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.users.id is uuid; our public.users.uid is text. Cast at the boundary
  -- so the rest of the schema can use text ids (matches local-mode mocks
  -- which use arbitrary strings like "local-admin-uid").
  INSERT INTO public.users (uid, email, name, photo_url)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (uid) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE people         ENABLE ROW LEVEL SECURITY;
ALTER TABLE families       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_invites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions    ENABLE ROW LEVEL SECURITY;

-- All policies below use `DROP POLICY IF EXISTS … ; CREATE POLICY …` so the
-- migration is idempotent — safe to re-run after partial application.

-- users — self-read/write only. Uid is immutable (no policy allows it to
-- change). New rows are created by the auth trigger above, not directly.
DROP POLICY IF EXISTS users_self_select ON users;
CREATE POLICY users_self_select ON users
  FOR SELECT USING (uid = auth.uid()::text);

DROP POLICY IF EXISTS users_self_update ON users;
CREATE POLICY users_self_update ON users
  FOR UPDATE USING (uid = auth.uid()::text)
  WITH CHECK (uid = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- RLS helper functions
--
-- Every cross-table membership / ownership check goes through a SECURITY
-- DEFINER function rather than an inline `EXISTS (SELECT … FROM other_table)`
-- subquery. The reason is RLS recursion: Postgres re-applies row-level
-- policies to every implicit SELECT, including the ones inside USING clauses.
-- That means a policy on `trees` that subqueries `tree_members` triggers the
-- policy on `tree_members`, which can subquery `trees` again — Postgres
-- detects the loop and aborts with "infinite recursion detected in policy".
--
-- The functions below run as their owner (the migration-applying role, which
-- has BYPASSRLS on Supabase), so their internal SELECTs don't re-fire the
-- calling table's policy. Treat these as the canonical way to express any
-- "is this user a member / owner / editor of this tree?" check.
-- ---------------------------------------------------------------------------

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

-- trees — readable by any member; writable only by owner.
DROP POLICY IF EXISTS trees_member_select ON trees;
CREATE POLICY trees_member_select ON trees
  FOR SELECT USING (public.is_tree_member(id, auth.uid()::text));

DROP POLICY IF EXISTS trees_owner_insert ON trees;
CREATE POLICY trees_owner_insert ON trees
  FOR INSERT WITH CHECK (owner_uid = auth.uid()::text);

DROP POLICY IF EXISTS trees_owner_update ON trees;
CREATE POLICY trees_owner_update ON trees
  FOR UPDATE USING (owner_uid = auth.uid()::text)
  WITH CHECK (owner_uid = auth.uid()::text);

DROP POLICY IF EXISTS trees_owner_delete ON trees;
CREATE POLICY trees_owner_delete ON trees
  FOR DELETE USING (owner_uid = auth.uid()::text);

-- tree_members — readable by any member of the same tree; writable only by
-- owner. The "create your own membership" path is the owner-insert during tree
-- creation, which the API route does as the user (auth.uid()::text === owner_uid).
DROP POLICY IF EXISTS tree_members_select ON tree_members;
CREATE POLICY tree_members_select ON tree_members
  FOR SELECT USING (public.is_tree_member(tree_id, auth.uid()::text));

DROP POLICY IF EXISTS tree_members_owner_write ON tree_members;
CREATE POLICY tree_members_owner_write ON tree_members
  FOR ALL
  USING (public.is_tree_owner(tree_id, auth.uid()::text))
  WITH CHECK (public.is_tree_owner(tree_id, auth.uid()::text));

-- people — readable by any tree member; writable by owner + editor.
DROP POLICY IF EXISTS people_member_select ON people;
CREATE POLICY people_member_select ON people
  FOR SELECT USING (public.is_tree_member(tree_id, auth.uid()::text));

DROP POLICY IF EXISTS people_editor_write ON people;
CREATE POLICY people_editor_write ON people
  FOR ALL
  USING (public.is_tree_editor(tree_id, auth.uid()::text))
  WITH CHECK (public.is_tree_editor(tree_id, auth.uid()::text));

-- families — same rules as people.
DROP POLICY IF EXISTS families_member_select ON families;
CREATE POLICY families_member_select ON families
  FOR SELECT USING (public.is_tree_member(tree_id, auth.uid()::text));

DROP POLICY IF EXISTS families_editor_write ON families;
CREATE POLICY families_editor_write ON families
  FOR ALL
  USING (public.is_tree_editor(tree_id, auth.uid()::text))
  WITH CHECK (public.is_tree_editor(tree_id, auth.uid()::text));

-- tree_invites — owner can read all for trees they own; the invited email can
-- read their own pending invite (to surface "you have a pending invite to X").
-- Write access (create/revoke) is owner-only.
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

-- suggestions — any authenticated user can insert their own; reads are
-- handled by a separate site-admin role (env-allowlisted uid) via a server
-- route, so the table-level policy is restrictive by default.
DROP POLICY IF EXISTS suggestions_self_insert ON suggestions;
CREATE POLICY suggestions_self_insert ON suggestions
  FOR INSERT WITH CHECK (uid = auth.uid()::text);

DROP POLICY IF EXISTS suggestions_self_select ON suggestions;
CREATE POLICY suggestions_self_select ON suggestions
  FOR SELECT USING (uid = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- updated_at trigger — automatically bump updated_at on row updates.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS people_updated_at ON people;
CREATE TRIGGER people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS families_updated_at ON families;
CREATE TRIGGER families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
