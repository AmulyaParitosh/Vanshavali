-- ============================================================================
-- 0005_whoami_diagnostic.sql — whoami() RPC for verifying JWT validation
--
-- Returns what Postgres / PostgREST currently see about the calling JWT:
--   - auth.uid()  — the JWT's sub claim, or NULL if PostgREST couldn't
--                   validate the JWT (treats request as anon)
--   - auth.role() — the role claim, or 'anon' if validation failed
--
-- Call from the browser console:
--   await (await fetch("https://<project>.supabase.co/rest/v1/rpc/whoami", {
--     method: "POST",
--     headers: {
--       apikey: "<ANON_KEY>",
--       Authorization: `Bearer ${session.access_token}`,
--       "Content-Type": "application/json",
--     },
--     body: "{}",
--   })).json()
--
-- Or from the app:
--   const { data } = await supabase.rpc("whoami");
--
-- If `auth_uid` matches your session.user.id and `auth_role` is "authenticated",
-- the JWT is validating correctly. If `auth_uid` is null and `auth_role` is
-- "anon", PostgREST can't verify your JWT — the JWT Keys config in the dashboard
-- needs the fix described in docs/SUPABASE-SETUP.md.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.whoami()
RETURNS TABLE(auth_uid text, auth_role text, jwt_iss text)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT
    auth.uid()::text AS auth_uid,
    auth.role()::text AS auth_role,
    (current_setting('request.jwt.claims', true)::jsonb ->> 'iss') AS jwt_iss;
$$;

-- The function is grant-by-default to authenticated and anon (RPC is opt-in via
-- explicit invocation), but make it explicit for clarity. Even anon can call it
-- — that's intentional, so the user can verify "yes Postgres sees me as anon".
GRANT EXECUTE ON FUNCTION public.whoami() TO anon, authenticated;
