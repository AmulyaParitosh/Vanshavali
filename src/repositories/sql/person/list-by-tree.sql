select id, tree_id, data, user_id, version, created_at, updated_at
from people
where tree_id = $1
order by created_at;
