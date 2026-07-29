-- Vanshavali schema — declarative source of truth (public schema).
--
-- No RLS. The app connects as the table owner via the repository layer
-- (src/repositories/*, raw SQL over pg) and enforces access in the service
-- layer (src/services/authz.ts). No policies, no SECURITY DEFINER helpers, and
-- no auth.users trigger — the services create the users row on every write path
-- (UserRepository.ensure / upsert).
--
-- Tables are declared in FK dependency order. Edit this file to change the
-- schema, then `npm run db:diff -- <name>` to generate a migration.

create table users (
  uid         text primary key,
  email       text not null,
  name        text,
  photo_url   text,
  created_at  timestamptz not null default now()
);

create table trees (
  id          text primary key,
  name        text not null,
  owner_uid   text not null references users (uid) on delete restrict,
  visibility  text not null default 'private',
  created_at  timestamptz not null default now()
);
create index trees_owner_idx on trees (owner_uid);

create table tree_members (
  tree_id    text not null references trees (id) on delete cascade,
  uid        text not null references users (uid) on delete cascade,
  role       text not null check (role in ('owner', 'editor', 'viewer')),
  person_id  text,
  joined_at  timestamptz not null default now(),
  primary key (tree_id, uid)
);
create index tree_members_uid_idx on tree_members (uid);

create table people (
  id          text primary key,
  tree_id     text not null references trees (id) on delete cascade,
  data        jsonb not null,
  user_id     text references users (uid) on delete set null,
  -- Optimistic-lock counter for the per-record patch path (Spec 13 flow 7): a
  -- save carries the version it read, and a stale base loses the WHERE match so
  -- the write returns no row (the service turns that into a 409 conflict).
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index people_tree_idx on people (tree_id);
create unique index people_tree_user_unique on people (tree_id, user_id) where user_id is not null;
create unique index people_tree_root_unique on people (tree_id) where (data ->> 'root')::boolean = true;

create table families (
  id          text primary key,
  tree_id     text not null references trees (id) on delete cascade,
  husband_id  text references people (id) on delete set null,
  wife_id     text references people (id) on delete set null,
  children    text[] not null default '{}',
  -- Marriage facts (Spec 08 / QUESTIONS Q11): free-form date string + place, both
  -- optional. Read back as a prose sentence in the household editor.
  marriage_date   text,
  marriage_place  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index families_tree_idx on families (tree_id);

create table tree_invites (
  id          text primary key,
  tree_id     text not null references trees (id) on delete cascade,
  email       text not null,
  -- The person this invite ties an account to (Spec 06: an invitation is fired
  -- from a specific row, so the invitee lands on their own branch). Nullable for
  -- the legacy email-only path; cascades if that person is deleted.
  person_id   text references people (id) on delete cascade,
  role        text not null check (role in ('editor', 'viewer')),
  -- Was NOT NULL + ON DELETE SET NULL in the old 0001 (contradictory — would
  -- error when an inviter was deleted). Cascade the invite with the inviter.
  invited_by  text not null references users (uid) on delete cascade,
  status      text not null default 'pending'
              check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);
create index tree_invites_tree_idx on tree_invites (tree_id);
create index tree_invites_email_idx on tree_invites (email);

create table suggestions (
  id          text primary key,
  uid         text not null references users (uid) on delete cascade,
  message     text not null,
  status      text not null default 'unread'
              check (status in ('unread', 'read', 'archived', 'prioritized')),
  created_at  timestamptz not null default now()
);
