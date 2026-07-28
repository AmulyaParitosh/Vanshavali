update tree_members
set person_id = $3
where tree_id = $1 and uid = $2;
