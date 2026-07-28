select id, name, owner_uid, visibility, created_at
from trees
where id = $1;
