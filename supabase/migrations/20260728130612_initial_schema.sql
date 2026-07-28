-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE FUNCTION public.tg_touch_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE TABLE public.families (
  id         text                     NOT NULL,
  tree_id    text                     NOT NULL,
  husband_id text,
  wife_id    text,
  children   text[]                   DEFAULT '{}'::text[] NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.families
  ADD CONSTRAINT families_pkey PRIMARY KEY (id);

CREATE INDEX families_tree_idx ON public.families (tree_id);

CREATE TRIGGER families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.people (
  id         text                     NOT NULL,
  tree_id    text                     NOT NULL,
  data       jsonb                    NOT NULL,
  user_id    text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.people
  ADD CONSTRAINT people_pkey PRIMARY KEY (id);

ALTER TABLE public.families
  ADD CONSTRAINT families_husband_id_fkey FOREIGN KEY (husband_id) REFERENCES public.people(id) ON DELETE SET NULL;

ALTER TABLE public.families
  ADD CONSTRAINT families_wife_id_fkey FOREIGN KEY (wife_id) REFERENCES public.people(id) ON DELETE SET NULL;

CREATE INDEX people_tree_idx ON public.people (tree_id);

CREATE UNIQUE INDEX people_tree_root_unique ON public.people (tree_id)
  WHERE ((DATA ->> 'root'::text)::boolean) = true;

CREATE UNIQUE INDEX people_tree_user_unique ON public.people (tree_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE TRIGGER people_updated_at
  BEFORE UPDATE ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.suggestions (
  id         text                     NOT NULL,
  uid        text                     NOT NULL,
  message    text                     NOT NULL,
  status     text                     DEFAULT 'unread'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.suggestions
  ADD CONSTRAINT suggestions_pkey PRIMARY KEY (id);

ALTER TABLE public.suggestions
  ADD CONSTRAINT suggestions_status_check CHECK (status = ANY (ARRAY['unread'::text, 'read'::text, 'archived'::text, 'prioritized'::text]));

CREATE TABLE public.tree_invites (
  id         text                     NOT NULL,
  tree_id    text                     NOT NULL,
  email      text                     NOT NULL,
  role       text                     NOT NULL,
  invited_by text                     NOT NULL,
  status     text                     DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone
);

ALTER TABLE public.tree_invites
  ADD CONSTRAINT tree_invites_pkey PRIMARY KEY (id);

ALTER TABLE public.tree_invites
  ADD CONSTRAINT tree_invites_role_check CHECK (role = ANY (ARRAY['editor'::text, 'viewer'::text]));

ALTER TABLE public.tree_invites
  ADD CONSTRAINT tree_invites_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text]));

CREATE INDEX tree_invites_email_idx ON public.tree_invites (email);

CREATE INDEX tree_invites_tree_idx ON public.tree_invites (tree_id);

CREATE TABLE public.tree_members (
  tree_id   text                     NOT NULL,
  uid       text                     NOT NULL,
  role      text                     NOT NULL,
  person_id text,
  joined_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.tree_members
  ADD CONSTRAINT tree_members_pkey PRIMARY KEY (tree_id, uid);

ALTER TABLE public.tree_members
  ADD CONSTRAINT tree_members_role_check CHECK (role = ANY (ARRAY['owner'::text, 'editor'::text, 'viewer'::text]));

CREATE INDEX tree_members_uid_idx ON public.tree_members (uid);

CREATE TABLE public.trees (
  id         text                     NOT NULL,
  name       text                     NOT NULL,
  owner_uid  text                     NOT NULL,
  visibility text                     DEFAULT 'private'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.trees
  ADD CONSTRAINT trees_pkey PRIMARY KEY (id);

ALTER TABLE public.families
  ADD CONSTRAINT families_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES public.trees(id) ON DELETE CASCADE;

ALTER TABLE public.people
  ADD CONSTRAINT people_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES public.trees(id) ON DELETE CASCADE;

ALTER TABLE public.tree_invites
  ADD CONSTRAINT tree_invites_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES public.trees(id) ON DELETE CASCADE;

ALTER TABLE public.tree_members
  ADD CONSTRAINT tree_members_tree_id_fkey FOREIGN KEY (tree_id) REFERENCES public.trees(id) ON DELETE CASCADE;

CREATE INDEX trees_owner_idx ON public.trees (owner_uid);

CREATE TABLE public.users (
  uid        text                     NOT NULL,
  email      text                     NOT NULL,
  name       text,
  photo_url  text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (uid);

ALTER TABLE public.people
  ADD CONSTRAINT people_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(uid) ON DELETE SET NULL;

ALTER TABLE public.suggestions
  ADD CONSTRAINT suggestions_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;

ALTER TABLE public.tree_invites
  ADD CONSTRAINT tree_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(uid) ON DELETE CASCADE;

ALTER TABLE public.tree_members
  ADD CONSTRAINT tree_members_uid_fkey FOREIGN KEY (uid) REFERENCES public.users(uid) ON DELETE CASCADE;

ALTER TABLE public.trees
  ADD CONSTRAINT trees_owner_uid_fkey FOREIGN KEY (owner_uid) REFERENCES public.users(uid) ON DELETE RESTRICT;

