insert into trees (id, name, owner_uid, visibility)
values ($1, $2, $3, $4)
returning id, name, owner_uid, visibility, created_at;
