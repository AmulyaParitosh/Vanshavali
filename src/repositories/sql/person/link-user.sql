-- Atomic link: only succeeds while the person is still unlinked (user_id null).
-- The WHERE is evaluated under the row's MVCC snapshot, so two concurrent
-- linkers can't both win.
update people
set user_id = $3
where id = $2 and tree_id = $1 and user_id is null
returning id;
