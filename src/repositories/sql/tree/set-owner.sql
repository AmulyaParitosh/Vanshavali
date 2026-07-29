-- Reassign the tree's keeper (Spec 11 a9 hand-over). Runs inside the hand-over
-- transaction alongside the two membership-role writes.
update trees set owner_uid = $2 where id = $1;
