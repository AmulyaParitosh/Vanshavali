select id, tree_id, husband_id, wife_id, children, marriage_date, marriage_place, created_at, updated_at
from families
where tree_id = $1
order by created_at;
