-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

ALTER TABLE public.tree_invites
  ADD COLUMN person_id text;

ALTER TABLE public.tree_invites
  ADD CONSTRAINT tree_invites_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE CASCADE;