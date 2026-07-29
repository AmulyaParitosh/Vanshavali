select id, tree_id, email, person_id, role, invited_by, status, created_at, expires_at
from tree_invites
where tree_id = $1
order by created_at desc;
