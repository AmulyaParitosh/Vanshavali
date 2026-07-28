insert into users (uid, email, name, photo_url)
values ($1, $2, $3, $4)
on conflict (uid) do update
  set email = excluded.email,
      name = excluded.name,
      photo_url = excluded.photo_url;
