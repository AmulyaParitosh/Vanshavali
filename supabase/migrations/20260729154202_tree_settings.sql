-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

ALTER TABLE public.trees
  ADD COLUMN place text;

ALTER TABLE public.trees
  ADD COLUMN name_order text DEFAULT 'devanagari'::text NOT NULL;

ALTER TABLE public.trees
  ADD CONSTRAINT trees_name_order_check CHECK (name_order = ANY (ARRAY['devanagari'::text, 'latin'::text, 'latin-only'::text]));

ALTER TABLE public.trees
  ADD COLUMN default_invite_role text DEFAULT 'editor'::text NOT NULL;

ALTER TABLE public.trees
  ADD CONSTRAINT trees_default_invite_role_check CHECK (default_invite_role = ANY (ARRAY['editor'::text, 'viewer'::text]));

ALTER TABLE public.trees
  ADD COLUMN readers_see_dates boolean DEFAULT false NOT NULL;

ALTER TABLE public.trees
  ADD COLUMN allow_own_children boolean DEFAULT true NOT NULL;