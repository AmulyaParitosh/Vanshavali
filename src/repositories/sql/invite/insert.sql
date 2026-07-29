insert into tree_invites (id, tree_id, email, person_id, role, invited_by, status, expires_at)
values ($1, $2, $3, $4, $5, $6, 'pending', $7)
returning id, tree_id, email, person_id, role, invited_by, status, created_at, expires_at;
