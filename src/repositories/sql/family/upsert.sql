insert into families (id, tree_id, husband_id, wife_id, children)
values ($1, $2, $3, $4, $5)
on conflict (id) do update
  set husband_id = excluded.husband_id,
      wife_id = excluded.wife_id,
      children = excluded.children,
      updated_at = now();
