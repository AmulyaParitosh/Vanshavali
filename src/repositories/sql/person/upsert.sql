insert into people (id, tree_id, data, user_id)
values ($1, $2, $3, $4)
on conflict (id) do update
  set data = excluded.data,
      user_id = excluded.user_id,
      updated_at = now();
