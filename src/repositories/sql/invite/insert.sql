insert into tree_invites (id, tree_id, email, role, invited_by, status, expires_at)
values ($1, $2, $3, $4, $5, 'pending', $6)
returning id, tree_id, email, role, invited_by, status, created_at, expires_at;
