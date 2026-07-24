# Supabase setup

End-to-end checklist for provisioning a Supabase project to run Vanshavali. The migrations and the apply-policies script handle most of it, but a handful of steps have to be done through the dashboard because Supabase blocks direct SQL access to specific subsystems (storage, auth providers, realtime publication).

Order matters. Following the steps top-to-bottom takes ~10 minutes on a fresh project.

## Prerequisites on your machine

- Node 20+
- `.env` populated from `.env.sample`. Required for setup:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
  - `DATABASE_URL` — Supabase Project Settings → Database → **Connection string → URI**, with your DB password substituted
  - `NEXT_PUBLIC_APP_ENV=supabase` (or leave unset — the provider factory auto-selects supabase when the env above is present)

## 1. Create the Supabase project

Dashboard → **New project**. Pick a strong DB password (you'll need it for `DATABASE_URL`). Wait ~2 minutes for provisioning.

## 2. Push the schema

```bash
npm run db:push
```

Drizzle Kit creates the tables defined in `db/schema.ts` (`users`, `trees`, `tree_members`, `people`, `families`, `tree_invites`, `suggestions`). Run this first — `0001_initial.sql` has `CREATE TABLE IF NOT EXISTS …` as a safety net but Drizzle won't track the schema state unless `db:push` baselines it.

Verify:

- Dashboard → **Table Editor** → confirm all seven tables exist under the `public` schema.

## 3. Apply RLS policies + triggers

```bash
npm run db:apply-policies
```

This runs every `.sql` file under `db/migrations/` in alphabetical order, each in its own transaction. Expected output:

```
Applying 0001_initial.sql...
  ✓ 0001_initial.sql
Applying 0002_storage_policies.sql...
  ⚠ 0002_storage_policies.sql: cannot apply as plain SQL on Supabase
     apply via Dashboard → Storage → <bucket> → Policies → New policy.
     See the header comment in this file for step-by-step.
Applying 0003_fix_member_select_recursion.sql...
  ✓ 0003_fix_member_select_recursion.sql

Done — but 1 file(s) still need the dashboard:
  • db/migrations/0002_storage_policies.sql
Open: https://supabase.com/dashboard/project/<your-ref>/sql/new
```

The skipped `0002` is intentional — see step 5. The `0001`/`0003` apply makes table policies, triggers, and the `public.is_tree_member` SECURITY DEFINER helper that breaks the `tree_members` RLS recursion.

If `0001` errors with `operator does not exist: text = uuid`, you're on an older copy — pull the latest, which casts `auth.uid()` to `text` everywhere.

## 4. Create the `images` storage bucket

The storage provider hardcodes `BUCKET = "images"` (`src/services/supabase/SupabaseStorageProvider.ts`). It has to exist before any upload works, and the policies in step 5 reference it.

1. Dashboard → **Storage** → **New bucket**
2. Name: `images`
3. **Public bucket**: ON (v1 uses `getPublicUrl()`; tightening to signed URLs is on the backlog)
4. File size limit: `5 MB` is a reasonable cap
5. Allowed MIME types: leave blank to allow all, or restrict to `image/*`

## 5. Create storage policies (via the Storage UI, not SQL)

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

## 6. Add tables to the Realtime publication

Supabase Realtime only emits `postgres_changes` events for tables in the `supabase_realtime` publication. **The default publication includes nothing.** Without this step, every `subscribeWithRealtime` channel works (initial fetch fires once) but live updates never come through, and you'll think realtime is broken when it's actually just unconfigured.

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

## 7. Configure auth providers

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

## 8. Smoke test

```bash
npm run dev
```

Walk through:

1. **Sign up** with email/password → should land on the auto-provisioned root tree without any console errors. (If `my-trees:<uid> fetch failed` appears, step 3 didn't apply `0003` — re-run `db:apply-policies`.)
2. **Add a person** in `/tree/<id>/people` → should appear immediately. Open the app in a second tab to confirm Realtime fires the update (step 6).
3. **Upload an image** for that person → should succeed. (Bucket missing = step 4; "violates row-level security policy" = step 5.)
4. **Sign out, sign in with Google** → should land on the same tree.
5. **Send an invite** from `/tree/<id>/members` to a different email → should send via Resend, land at `/invite/<id>`, and after acceptance create a `tree_members` row visible to both users.

## Common errors and what they mean

| Error / symptom                                                                                          | Cause                                                  | Fix                                                                        |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Sign-up returns 429 `over_email_send_rate_limit`                                                         | Hit Supabase default SMTP cap (3–4/hour)               | Step 7 — disable confirm email OR configure Resend SMTP                    |
| Post-login `[realtime my-trees:<uid>] fetch failed` with empty `{}` payload                              | `tree_members` RLS infinite recursion                  | Step 3 — apply `0003_fix_member_select_recursion.sql`                      |
| `apply-rls-policies` errors with `must be owner of table objects`                                        | Trying to apply storage policies via direct connection | Step 5 — use the Storage UI; script now skips this file with a warning     |
| Live updates never arrive (initial fetch works, no realtime events)                                      | Tables not in `supabase_realtime` publication          | Step 6                                                                     |
| `Bucket not found` on upload                                                                             | `images` bucket missing                                | Step 4                                                                     |
| `new row violates row-level security policy` on upload                                                   | Storage policies missing or wrong path                 | Step 5 — policies expect `trees/{treeId}/...` prefix                       |
| `permission denied to set role "supabase_storage_admin"`                                                 | Direct connection role lacks storage-admin grant       | Expected; storage policies cannot be applied this way on hardened projects |
| `infinite recursion detected in policy for relation "tree_members"`                                      | `0003` not applied                                     | Re-run `npm run db:apply-policies`                                         |
| `infinite recursion detected in policy for relation "trees"` (or `people` / `families` / `tree_invites`) | Cross-table policy loop — `0004` not applied           | Re-run `npm run db:apply-policies`                                         |

## Re-running this on a second environment

The scripts and SQL are idempotent — `DROP POLICY IF EXISTS`, `ON CONFLICT DO NOTHING`, `EXCEPTION WHEN duplicate_object`. You can re-run the steps from scratch on staging / production without worrying about partial state, except for:

- The storage bucket (manual create per environment)
- The storage policies (manual create per environment, via UI)
- Auth provider config (per environment)

A future Phase will codify the manual steps via the Supabase Management API. For v1 this checklist is the source of truth.
