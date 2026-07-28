-- Trees the user belongs to but does NOT own (owner trees come from list-owned).
select t.id, t.name, t.owner_uid, t.visibility, t.created_at
from trees t
join tree_members m on m.tree_id = t.id
where m.uid = $1 and t.owner_uid <> $1
order by t.created_at;
