insert into trees (id, name, owner_uid, visibility)
values ($1, $2, $3, $4)
returning id, name, owner_uid, visibility, place, name_order,
          default_invite_role, readers_see_dates, allow_own_children, created_at;
