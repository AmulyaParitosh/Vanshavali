-- Per-record optimistic-lock write (Spec 13 flow 7). The update only matches
-- when the caller's base version is still current; a stale base matches no row,
-- and the service turns the empty result into a 409 conflict. On success the
-- version is bumped and the fresh row returned.
update people
set data = $3,
    version = version + 1,
    updated_at = now()
where id = $1 and tree_id = $2 and version = $4
returning id, tree_id, data, user_id, version, created_at, updated_at;
