select tree_id, uid, role, person_id, joined_at
from tree_members
where tree_id = $1
order by joined_at;
