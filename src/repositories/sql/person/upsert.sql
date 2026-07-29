insert into people (id, tree_id, data, user_id)
values ($1, $2, $3, $4)
on conflict (id) do update
  set data = excluded.data,
      user_id = excluded.user_id,
      -- Bump the optimistic-lock counter so a bulk save (this path) also
      -- invalidates any in-flight per-record edit's base version (Spec 13 flow 7).
      version = people.version + 1,
      updated_at = now();
