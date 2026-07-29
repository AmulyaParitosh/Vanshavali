-- One patch per settings card (Spec 11 save model). Each field is coalesced, so
-- a null param leaves that column unchanged — the caller passes only the columns
-- the saved card touched, null for the rest.
update trees
set name                = coalesce($2, name),
    place               = coalesce($3, place),
    name_order          = coalesce($4, name_order),
    default_invite_role = coalesce($5, default_invite_role),
    readers_see_dates   = coalesce($6, readers_see_dates),
    allow_own_children  = coalesce($7, allow_own_children)
where id = $1
returning id, name, owner_uid, visibility, place, name_order,
          default_invite_role, readers_see_dates, allow_own_children, created_at;
