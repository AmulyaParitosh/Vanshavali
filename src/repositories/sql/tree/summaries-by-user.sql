-- Picker cards (Spec 03 d1): every tree the user belongs to, with their role, the
-- person count, and the first four people (for the portrait cluster). Ordered by
-- created_at as a stand-in until last_opened_at is tracked. One membership row per
-- (tree, uid), so owned trees (owner membership) and member trees both appear here.
select t.id,
       t.name,
       t.place,
       m.role,
       (select count(*) from people where tree_id = t.id) as person_count,
       coalesce(
         (
           select json_agg(json_build_object('id', p.id, 'name', p.data -> 'name' ->> 'official_name'))
           from (
             select id, data from people where tree_id = t.id order by created_at limit 4
           ) p
         ),
         '[]'::json
       ) as portraits
from tree_members m
join trees t on t.id = m.tree_id
where m.uid = $1
order by t.created_at;
