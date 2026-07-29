select id, tree_id, email, person_id, role, invited_by, status, created_at, expires_at
from tree_invites
where id = $1;
