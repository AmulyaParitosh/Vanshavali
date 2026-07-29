select id, name, owner_uid, visibility, place, name_order,
       default_invite_role, readers_see_dates, allow_own_children, created_at
from trees
where owner_uid = $1
order by created_at;
