create table if not exists public.signatures (
  id text primary key,
  name text check (name is null or char_length(name) between 1 and 80),
  email text,
  country text check (country is null or char_length(country) between 1 and 80),
  public_name boolean not null default false,
  updates_opt_in boolean not null default false,
  status text not null default 'pending' check (status in ('accepted','pending','rejected')),
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  email_verified_at timestamptz,
  verify_token_hash text unique,
  delete_token_hash text not null unique,
  session_hash text not null,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists signatures_email_active_unique_idx on public.signatures (email) where email is not null and status in ('accepted','pending');
create unique index if not exists signatures_session_active_unique_idx on public.signatures (session_hash) where status in ('accepted','pending');
create index if not exists signatures_status_idx on public.signatures (status);
create index if not exists signatures_created_at_idx on public.signatures (created_at desc);
create index if not exists signatures_ip_hash_idx on public.signatures (ip_hash);
create index if not exists signatures_user_agent_hash_idx on public.signatures (user_agent_hash);
create index if not exists signatures_email_verified_idx on public.signatures (email_verified_at) where email_verified_at is not null;

create table if not exists public.petition_stats (
  id text primary key,
  accepted_count bigint not null default 0,
  email_verified_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.petition_stats (id, accepted_count, email_verified_count)
select 'global', count(*) filter (where status='accepted'), count(*) filter (where status='accepted' and email_verified_at is not null)
from public.signatures
on conflict (id) do update set accepted_count=excluded.accepted_count, email_verified_count=excluded.email_verified_count, updated_at=now();

create or replace function public.sync_petition_stats()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_accepted integer := 0;
  new_accepted integer := 0;
  old_verified integer := 0;
  new_verified integer := 0;
begin
  if TG_OP <> 'INSERT' then
    old_accepted := case when OLD.status='accepted' then 1 else 0 end;
    old_verified := case when OLD.status='accepted' and OLD.email_verified_at is not null then 1 else 0 end;
  end if;
  if TG_OP <> 'DELETE' then
    new_accepted := case when NEW.status='accepted' then 1 else 0 end;
    new_verified := case when NEW.status='accepted' and NEW.email_verified_at is not null then 1 else 0 end;
  end if;
  update public.petition_stats
  set accepted_count=greatest(0,accepted_count + new_accepted - old_accepted),
      email_verified_count=greatest(0,email_verified_count + new_verified - old_verified),
      updated_at=now()
  where id='global';
  return case when TG_OP='DELETE' then OLD else NEW end;
end;
$$;

drop trigger if exists signatures_stats_trigger on public.signatures;
create trigger signatures_stats_trigger after insert or update or delete on public.signatures for each row execute function public.sync_petition_stats();

alter table public.signatures enable row level security;
alter table public.petition_stats enable row level security;
revoke all on table public.signatures from anon, authenticated;
revoke all on table public.petition_stats from anon, authenticated;
revoke execute on function public.sync_petition_stats() from public, anon, authenticated;
