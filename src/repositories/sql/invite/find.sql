select id, tree_id, email, role, invited_by, status, created_at, expires_at
from tree_invites
where id = $1;
