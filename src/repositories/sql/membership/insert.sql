insert into tree_members (tree_id, uid, role)
values ($1, $2, $3)
on conflict (tree_id, uid) do nothing;
