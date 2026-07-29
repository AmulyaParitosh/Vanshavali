select id, tree_id, data, user_id, version, created_at, updated_at
from people
where user_id = $1;
