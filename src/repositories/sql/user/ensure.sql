-- Make sure a users row exists without clobbering an existing name/photo.
-- The auth trigger normally creates it; this guards the rare miss.
insert into users (uid, email)
values ($1, $2)
on conflict (uid) do nothing;
