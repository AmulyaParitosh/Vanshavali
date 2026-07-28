select id, name, owner_uid, visibility, created_at
from trees
where owner_uid = $1
order by created_at;
