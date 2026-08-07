create table if not exists public.petition_internal (
  id text primary key,
  hmac_salt text not null,
  created_at timestamptz not null default now()
);
insert into public.petition_internal (id, hmac_salt)
values ('global', gen_random_uuid()::text || gen_random_uuid()::text)
on conflict (id) do nothing;
alter table public.petition_internal enable row level security;
revoke all on table public.petition_internal from anon, authenticated;
