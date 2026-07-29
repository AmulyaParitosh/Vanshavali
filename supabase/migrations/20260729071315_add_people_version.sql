-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

ALTER TABLE public.people
  ADD COLUMN version integer DEFAULT 1 NOT NULL;