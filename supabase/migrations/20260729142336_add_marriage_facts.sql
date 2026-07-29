-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

ALTER TABLE public.families
  ADD COLUMN marriage_date text;

ALTER TABLE public.families
  ADD COLUMN marriage_place text;