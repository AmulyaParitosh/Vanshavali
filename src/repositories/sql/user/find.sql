select uid, email, name, photo_url, created_at
from users
where uid = $1;
