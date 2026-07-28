# Supabase setup

Two ways to run Vanshavali's Supabase backend:

- **Local development stack** (recommended for day-to-day dev) — a full Supabase stack (Postgres + Auth + Storage) running in Docker on your machine via the Supabase CLI. Fast, offline, disposable, and it exercises the **exact same code as prod**. See [§ Local development stack](#local-development-stack).
- **Cloud project** — a hosted Supabase project for staging/production. See [§ Cloud project setup](#cloud-project-setup).

The **app** selects its backend with `NEXT_PUBLIC_ENV` = `local` | `prod`. The **migration** commands use the Supabase CLI, which targets the local stack or the linked cloud project.

### How schema is managed (read this first)

- **`supabase/schemas/*.sql`** is the declared source of truth (tables, indexes, the `updated_at` trigger). You edit these.
- **`supabase/migrations/*.sql`** are generated from the schema by `supabase db diff` and applied by the CLI. You don't hand-edit them (except to trim the harmless image-default `GRANT` noise the diff emits — see below).
- **There is no RLS**, no policies, no grants, no realtime publication. The backend owns the tables: the app connects as the Postgres owner and enforces access in the service layer (`src/services/authz.ts`). The Data API roles get nothing (`auto_expose_new_tables = false`).
- The only thing migrations can't do is create the storage bucket — that's `npm run db:extras`.

**Changing the schema:** edit `supabase/schemas/*.sql` → `npm run db:diff -- <name>` → review the generated migration in `supabase/migrations/` (delete any `GRANT … TO anon/authenticated/service_role` lines the diff adds — they're image defaults, carry no data access, and `db reset`/`db diff` won't reintroduce drift) → `npm run db:reset` to apply locally.

---

## Local development stack

### Prerequisites

- Docker (or a compatible runtime like colima) running.
- The Supabase CLI is a dev dependency (`npx supabase …`), used via the `stack:*` / `db:*` npm scripts.

### One-time setup

```bash
# 1. Boot the local stack (pulls images on first run — a few minutes).
#    `supabase start` auto-applies everything in supabase/migrations/.
npm run stack:start

# 2. Create the images storage bucket (the one step migrations can't express).
NEXT_PUBLIC_ENV=local npm run db:extras
```

In `.env`, set `NEXT_PUBLIC_ENV=local`. For local, the URL + demo keys are built in — no other Supabase vars are needed.

### Run the app against local

```bash
npm run dev   # http://localhost:3000, against the local stack
```

Sign-up/sign-in works out of the box: the local stack has email confirmations off, and outbound email (invites, resets) is caught by Mailpit.

### Day-to-day commands

| Command                     | What it does                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run stack:start`       | Start the local stack (applies migrations).                                                    |
| `npm run stack:stop`        | Stop the containers (keeps data).                                                              |
| `npm run stack:status`      | Print URLs + keys (`API URL`, `anon key`, `DB URL`, Studio, Mailpit).                          |
| `npm run stack:reset`       | Nuke + restart the containers with a fresh DB.                                                 |
| `npm run db:reset`          | Drop + recreate the DB, re-applying all migrations (+ seed). Run after pulling new migrations. |
| `npm run db:diff -- <name>` | Generate a migration from your `supabase/schemas` edits.                                       |
| `npm run db:extras`         | Ensure the `images` bucket exists (re-run after `db:reset`).                                   |

Useful local URLs: **Supabase Studio** `http://127.0.0.1:54323` (tables, auth users, storage browser), **Mailpit** `http://127.0.0.1:54324` (all outbound email).

### Notes

- `db:reset` / `stack:reset` wipe the DB — re-run `npm run db:extras` afterward to recreate the bucket.
- The app's repository layer connects directly to Postgres (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`) as the owner. There are no RLS/JWT concerns locally — access is enforced in the service layer.

---

## Cloud project setup

End-to-end checklist for provisioning a hosted Supabase project. It's short now: apply migrations, create the bucket, configure auth. There are no storage policies, realtime publication, or RLS to set up.

## Prerequisites on your machine

- Logged into the Supabase CLI: `npx supabase login`.
- The project's `.env` filled for cloud (see below).

## 1. Create the Supabase project

Create a project in the Supabase dashboard. Note the project ref, the API URL, the anon key, the service-role key, and the database connection string (`DATABASE_URL`).

Fill `.env`:

```
NEXT_PUBLIC_ENV=prod
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>       # client auth only
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # /api/upload + db:extras
DATABASE_URL=postgresql://postgres:<pw>@<host>:5432/postgres  # app repository layer
```

## 2. Apply the schema (migrations)

Link the CLI to the project once, then push the migrations:

```bash
npx supabase link --project-ref <ref>
npm run db:push        # applies supabase/migrations/ to the linked project
```

`db push` applies every migration under `supabase/migrations/`, creating all seven tables (`users`, `trees`, `tree_members`, `people`, `families`, `tree_invites`, `suggestions`), indexes, and the `updated_at` trigger. No RLS, no policies, no functions beyond `tg_touch_updated_at`.

## 3. Create the `images` storage bucket

```bash
NEXT_PUBLIC_ENV=prod npm run db:extras   # creates the public `images` bucket via the Storage API
```

You'll be asked to confirm since the target is CLOUD (`--yes` / `CONFIRM_CLOUD=1` to skip in CI). The bucket is public-read; uploads go through `POST /api/upload` (service role), so there are **no storage policies to create**.

## 4. Configure auth providers

### Email

Enable Email in Dashboard → **Authentication** → **Providers**. For production, configure SMTP (or keep Supabase's default sender for low volume). Set the **Site URL** and **Redirect URLs** to your deployed origin(s) so magic links / recovery links resolve.

### Google

1. Create OAuth credentials in Google Cloud Console.
2. Dashboard → **Authentication** → **Providers** → **Google**: paste the client ID + secret.
3. Redirect URLs at Google Cloud Console must include Supabase's callback (`https://<ref>.supabase.co/auth/v1/callback`) and your app origin(s).

## 5. Smoke test

1. **Sign up** with email/password → should land on the auto-provisioned root tree with no console errors.
2. **Add a person** in `/tree/<id>/people` → save, and it appears (the page re-fetches after your own edit; there are no live updates).
3. **Upload an image** on a person → the image saves and displays (served from the public `images` bucket).

---

## Common errors and what they mean

| Symptom                                                             | Cause                                                       | Fix                                                                                         |
| ------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL must be set when NEXT_PUBLIC_ENV=prod`                | App repository layer has no connection string               | Set `DATABASE_URL` in `.env`                                                                |
| API calls return 401                                                | Missing/expired bearer token                                | Sign in again; check the Supabase Auth config (Site URL / redirect URLs)                    |
| `db push` reports nothing to apply but the cloud schema is empty    | CLI not linked to the right project                         | `npx supabase link --project-ref <ref>` and retry                                           |
| Image upload fails with a 5xx from `/api/upload`                    | `SUPABASE_SERVICE_ROLE_KEY` missing/wrong, or bucket absent | Set the service key; run `NEXT_PUBLIC_ENV=prod npm run db:extras`                           |
| `db diff` keeps adding `GRANT … TO anon/authenticated/service_role` | Supabase image default privileges on new tables             | Delete those lines from the generated migration — they carry no data access and don't drift |

## Re-running this on a second environment

Everything except the manual dashboard steps is scripted:

- Migrations: `npx supabase link` + `npm run db:push`
- Bucket: `NEXT_PUBLIC_ENV=prod npm run db:extras`
- Manual (dashboard): auth providers (Google client, SMTP, Site URL / redirect URLs)
