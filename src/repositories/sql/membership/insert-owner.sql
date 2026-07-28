insert into tree_members (tree_id, uid, role)
values ($1, $2, 'owner')
on conflict (tree_id, uid) do nothing;
