delete from people
where tree_id = $1 and id = any($2::text[]);
