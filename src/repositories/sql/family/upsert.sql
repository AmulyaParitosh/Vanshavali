insert into families (id, tree_id, husband_id, wife_id, children, marriage_date, marriage_place)
values ($1, $2, $3, $4, $5, $6, $7)
on conflict (id) do update
  set husband_id = excluded.husband_id,
      wife_id = excluded.wife_id,
      children = excluded.children,
      marriage_date = excluded.marriage_date,
      marriage_place = excluded.marriage_place,
      updated_at = now();
