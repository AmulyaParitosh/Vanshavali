update tree_members
set role = $3
where tree_id = $1 and uid = $2;
