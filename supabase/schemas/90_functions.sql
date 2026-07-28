-- Bump updated_at automatically on people / families updates.

create or replace function public.tg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger people_updated_at
  before update on people
  for each row execute function public.tg_touch_updated_at();

create trigger families_updated_at
  before update on families
  for each row execute function public.tg_touch_updated_at();
