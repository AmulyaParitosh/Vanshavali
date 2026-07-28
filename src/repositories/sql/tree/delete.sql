-- FKs cascade: deleting a tree removes its members, people, families, invites.
delete from trees where id = $1;
