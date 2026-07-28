# Supabase setup

Two ways to run Vanshavali's Supabase backend:

- **Local development stack** (recommended for day-to-day dev) — a full Supabase stack (Postgres + Auth + Storage + Realtime) running in Docker on your machine via the Supabase CLI. Fast, offline, disposable, and it exercises the **exact same provider code as prod**, so RLS / JWT / storage bugs surface locally before they reach the cloud. See [§ Local development stack](#local-development-stack) below.
- **Cloud project** — a hosted Supabase project for staging/production. See [§ Cloud project setup](#cloud-project-setup).

Switch between them with a single env var, `NEXT_PUBLIC_ENV` = `local` | `prod`.

---

## Local development stack

Runs the whole backend locally with `supabase start`. One-time setup is ~5 minutes (mostly image pulls).

### Prerequisites

- **Docker** running. Docker Desktop, OrbStack, or colima (`colima start`) all work — the Supabase CLI talks to the Docker daemon directly.
- The Supabase CLI, already added as a dev dependency (`npx supabase`), so no global install needed.

### One-time setup

Set `NEXT_PUBLIC_ENV=local` in `.env` first — every `db:*` command below then targets the local stack automatically.

```bash
# 1. Boot the local stack (pulls images on first run — a few minutes).
npm run stack:start

# 2. Create the schema + RLS + realtime publication + storage bucket & policies.
npm run db:setup
```

`db:setup` runs two steps against the active target (here, local):

- **migrations** (`db:apply-policies`) — applies `db/migrations/*.sql`: tables via the `CREATE TABLE IF NOT EXISTS` safety net in `0001`, plus all RLS policies, helper functions, and triggers.
- **extras** (`db:extras`) — the things a direct connection can't do through those migrations: GRANTs for the Data API roles, the `supabase_realtime` publication, and (local only) the `images` storage bucket + its RLS policies. Unlike cloud, the local `postgres` superuser _can_ create `storage.objects` policies directly, so local storage enforces the same per-tree rules as prod.

### Run the app against local

With `NEXT_PUBLIC_ENV=local` in `.env`:

```bash
npm run dev
```

The local API URL and demo keys are built in, so no other env vars are needed. Sign up with any email/password — email confirmation is off locally (`supabase/config.toml`), so you get a session immediately.

### Day-to-day commands

The `db:*` commands all follow `NEXT_PUBLIC_ENV`, so with it set to `local` they target the local DB. The `stack:*` commands manage the Docker stack (local-only, no cloud analog).

| Command                | What it does                                                             |
| ---------------------- | ------------------------------------------------------------------------ |
| `npm run stack:start`  | Start the stack (idempotent).                                            |
| `npm run stack:stop`   | Stop it (keeps data).                                                    |
| `npm run stack:status` | Print URLs + keys (`API URL`, `anon key`, `DB URL`, Studio, Mailpit).    |
| `npm run stack:reset`  | Wipe + restart with a fresh DB (`--no-backup`). Re-run `db:setup` after. |
| `npm run db:setup`     | (Re)apply schema + policies + extras to the active env.                  |

Useful local URLs: **Supabase Studio** `http://127.0.0.1:54323` (tables + auth users + storage browser — the fullest view of local data), **Mailpit** `http://127.0.0.1:54324` (catches all outbound email — invites, password resets — so you can click links without real SMTP).

> **Browsing data:** use **Supabase Studio** — local at `http://127.0.0.1:54323`, or the cloud project's dashboard. (There's no ORM/`db:studio` — Studio is the browser.)

### Notes

- If `npm run stack:status` shows an anon/service key different from the built-ins (older/newer CLI), set `NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL` / `SUPABASE_SERVICE_ROLE_KEY_LOCAL` in `.env`.
- Google OAuth isn't configured locally by default; use email/password. (Add `[auth.external.google]` to `supabase/config.toml` if you need it.)
- The local Postgres is `postgres` / `postgres` on port `54322` — browse it in Supabase Studio (`http://127.0.0.1:54323`) or point any SQL client at `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

---

## Cloud project setup

End-to-end checklist for provisioning a hosted Supabase project. The migrations and the apply-policies script handle most of it, but a handful of steps have to be done through the dashboard because Supabase blocks direct SQL access to specific subsystems (storage, auth providers, realtime publication).

Order matters. Following the steps top-to-bottom takes ~10 minutes on a fresh project. Set `NEXT_PUBLIC_ENV=prod` so the app and every `db:*` command target the cloud project. (Cloud-targeting `db:*` commands prompt for confirmation before writing — pass `--yes` or set `CONFIRM_CLOUD=1` in CI.)

## Prerequisites on your machine

- Node 20+
- `.env` populated from `.env.sample`. Required for cloud setup:
  - `NEXT_PUBLIC_ENV=prod`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - `DATABASE_URL` — Supabase Project Settings → Database → **Connection string → URI**, with your DB password substituted

## 1. Create the Supabase project

Dashboard → **New project**. Pick a strong DB password (you'll need it for `DATABASE_URL`). Wait ~2 minutes for provisioning.

## 2. Apply the schema + policies + extras

```bash
npm run db:setup      # tables + RLS + grants + realtime publication + bucket
```

You'll be asked to confirm since the target is CLOUD (`--yes` / `CONFIRM_CLOUD=1` to skip in CI). `db:setup` runs every `.sql` file under `db/migrations/` (each in its own transaction) — `0001_initial.sql` creates all seven tables (`users`, `trees`, `tree_members`, `people`, `families`, `tree_invites`, `suggestions`) plus RLS/triggers/functions — then applies the extras. Expected shape:

```
▶ target: CLOUD (<your-ref>)
== Migrations ==
Applying 0001_initial.sql...
  ✓ 0001_initial.sql
Applying 0002_storage_policies.sql...
  ⚠ 0002_storage_policies.sql: skipped (storage.objects can't take direct policy DDL)
     apply via Dashboard → Storage → <bucket> → Policies → New policy.
  ✓ 0003_fix_member_select_recursion.sql
  ✓ 0004_fix_cross_table_recursion.sql
  ✓ 0005_whoami_diagnostic.sql
== Extras ==
  ✓ Data API grants
  ✓ realtime publication
  • storage policies: apply via Dashboard Storage UI (cloud is owner-locked)
  ✓ images bucket
```

The `0001`/`0003`/`0004` apply makes table policies, triggers, and the SECURITY DEFINER helpers (`is_tree_member`, `is_tree_owner`, `is_tree_editor`) that break the RLS recursion. The skipped `0002` (storage policies) is intentional — it's owner-locked on cloud, so it's the one thing you still do by hand in step 4. `db:setup` already handled the realtime publication (step 5) and the `images` bucket (step 3), so on cloud only the **storage policies** and **auth provider config** remain manual.

If `0001` errors with `operator does not exist: text = uuid`, you're on an older copy — pull the latest, which casts `auth.uid()` to `text` everywhere.

## 3. Create the `images` storage bucket

> **`db:setup` already created this** (public `images` bucket). This step is verify-only unless you skipped `db:setup`.

The storage provider hardcodes `BUCKET = "images"` (`src/services/supabase/SupabaseStorageProvider.ts`). It has to exist before any upload works, and the policies in step 4 reference it. To create manually: Dashboard → **Storage** → **New bucket** → name `images`, **Public bucket** ON, `5 MB` limit, MIME types blank or `image/*`.

## 4. Create storage policies (via the Storage UI, not SQL)

`storage.objects` is owned by `supabase_storage_admin`, and recent Supabase projects block direct policy DDL on it **even through the Dashboard SQL editor**. The supported path is the Storage Policies UI.

1. Dashboard → **Storage** → click the `images` bucket → **Policies** tab
2. Click **New policy** → **For full customization**
3. Create four policies, one per operation. For each:
   - Set **Policy name** to the matching name below
   - Set **Allowed operation** to the matching operation
   - Set **Target roles** to `authenticated`
   - Paste the matching expression(s) into the policy editor

The expressions live in `db/migrations/0002_storage_policies.sql` — open the file alongside the dashboard and copy them across:

| Policy name            | Operation | USING | WITH CHECK |
| ---------------------- | --------- | ----- | ---------- |
| `images_member_select` | SELECT    | yes   | —          |
| `images_editor_insert` | INSERT    | —     | yes        |
| `images_editor_update` | UPDATE    | yes   | yes        |
| `images_editor_delete` | DELETE    | yes   | —          |

After all four are saved, an upload attempt from the app to a path outside `trees/{treeId}/...` should fail with an RLS error; an upload to a tree the user is an editor/owner of should succeed.

Skip this step at your peril — without it, any authenticated user can read/write any path in the bucket.

## 5. Add tables to the Realtime publication

> **`db:setup` already did this.** This step is verify-only (or a manual fallback if the extras step warned it couldn't).

Supabase Realtime only emits `postgres_changes` events for tables in the `supabase_realtime` publication. **The default publication includes nothing.** Without it, every `subscribeWithRealtime` channel works (initial fetch fires once) but live updates never come through, and you'll think realtime is broken when it's actually just unconfigured.

Dashboard → **SQL Editor** → New query → paste and run:

```sql
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['trees', 'tree_members', 'people', 'families', 'tree_invites', 'suggestions']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;
```

The block swallows `duplicate_object` so it's safe to re-run.

Verify: Dashboard → **Database** → **Publications** → `supabase_realtime` → six tables listed.

## 6. Configure auth providers

Dashboard → **Authentication** → **Sign In / Providers**.

### Email

- **Enabled**: ON
- **Confirm email**: see below.

For local development, turning **Confirm email** OFF lets sign-up complete immediately without going through SMTP. Turn it back ON before public launch.

Supabase's built-in SMTP is rate-limited to ~3–4 emails/hour on the free tier. If you keep confirm-email on, configure custom SMTP (Resend works well — you already have `RESEND_API_KEY`):

- Dashboard → **Project Settings** → **Auth** → **SMTP Settings** → enable custom SMTP
- Host: `smtp.resend.com`, Port: `465` (SSL), Username: `resend`, Password: `<RESEND_API_KEY>`
- Sender email: `RESEND_FROM_EMAIL`

### Google

- **Enabled**: ON
- **Client ID / Client Secret**: from a Google Cloud OAuth 2.0 Client (Web application type)
- Redirect URLs configured at Google Cloud Console must include:
  - `https://<project-ref>.supabase.co/auth/v1/callback`

Then in Vanshavali's URL configuration (Dashboard → Auth → URL Configuration):

- **Site URL**: `http://localhost:3000` (dev) or your production origin
- **Redirect URLs (Allow List)**: add the same origin(s) plus any preview deployments

## 7. Smoke test

```bash
npm run dev
```

Walk through:

1. **Sign up** with email/password → should land on the auto-provisioned root tree without any console errors. (If `my-trees:<uid> fetch failed` appears, step 2 didn't apply `0003` — re-run `db:setup`.)
2. **Add a person** in `/tree/<id>/people` → should appear immediately. Open the app in a second tab to confirm Realtime fires the update (step 5).
3. **Upload an image** for that person → should succeed. (Bucket missing = step 3; "violates row-level security policy" = step 4.)
4. **Sign out, sign in with Google** → should land on the same tree.
5. **Send an invite** from `/tree/<id>/members` to a different email → should send via Resend, land at `/invite/<id>`, and after acceptance create a `tree_members` row visible to both users.

## Common errors and what they mean

| Error / symptom                                                                                          | Cause                                                  | Fix                                                                        |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Sign-up returns 429 `over_email_send_rate_limit`                                                         | Hit Supabase default SMTP cap (3–4/hour)               | Step 6 — disable confirm email OR configure Resend SMTP                    |
| Post-login `[realtime my-trees:<uid>] fetch failed` with empty `{}` payload                              | `tree_members` RLS infinite recursion                  | Step 2 — apply `0003_fix_member_select_recursion.sql`                      |
| `apply-rls-policies` errors with `must be owner of table objects`                                        | Trying to apply storage policies via direct connection | Step 4 — use the Storage UI; script now skips this file with a warning     |
| Live updates never arrive (initial fetch works, no realtime events)                                      | Tables not in `supabase_realtime` publication          | Step 5                                                                     |
| `Bucket not found` on upload                                                                             | `images` bucket missing                                | Step 3                                                                     |
| `new row violates row-level security policy` on upload                                                   | Storage policies missing or wrong path                 | Step 4 — policies expect `trees/{treeId}/...` prefix                       |
| `permission denied to set role "supabase_storage_admin"`                                                 | Direct connection role lacks storage-admin grant       | Expected; storage policies cannot be applied this way on hardened projects |
| `infinite recursion detected in policy for relation "tree_members"`                                      | `0003` not applied                                     | Re-run `npm run db:apply-policies`                                         |
| `infinite recursion detected in policy for relation "trees"` (or `people` / `families` / `tree_invites`) | Cross-table policy loop — `0004` not applied           | Re-run `npm run db:apply-policies`                                         |

### JWT signing keys (`auth.uid()` returns null)

If every authenticated write fails RLS while the `whoami` diagnostic (`db/migrations/0005_whoami_diagnostic.sql`) shows `auth_role: "anon"`, the project's Auth signing key doesn't match what PostgREST validates — the token's `kid` isn't in the JWKS. Fix it in Dashboard → **Authentication** → **JWT Keys**: either promote the ES256 key to be the current signing key, or revert to the legacy HS256 secret. Then sign out and back in to mint a fresh token. Verify with `supabase.rpc('whoami')` — `auth_uid` should equal your user id.

## Re-running this on a second environment

The scripts and SQL are idempotent — `DROP POLICY IF EXISTS`, `ON CONFLICT DO NOTHING`, `EXCEPTION WHEN duplicate_object`. You can re-run the steps from scratch on staging / production without worrying about partial state, except for:

- The storage bucket (manual create per environment)
- The storage policies (manual create per environment, via UI)
- Auth provider config (per environment)

A future Phase will codify the manual steps via the Supabase Management API. For v1 this checklist is the source of truth.
