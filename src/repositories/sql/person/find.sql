select id, tree_id, data, user_id, version, created_at, updated_at
from people
where id = $1 and tree_id = $2;
