-- Migration from the original email-required prototype to the low-friction v2 schema.
-- Safe to run before public launch. Review on a backup first if production data already exists.

alter table public.signatures alter column name drop not null;
alter table public.signatures alter column email drop not null;
alter table public.signatures alter column country drop not null;
alter table public.signatures alter column verify_token_hash drop not null;

alter table public.signatures add column if not exists updates_opt_in boolean not null default false;
alter table public.signatures add column if not exists status text;
alter table public.signatures add column if not exists risk_score integer not null default 0;
alter table public.signatures add column if not exists email_verified_at timestamptz;
alter table public.signatures add column if not exists session_hash text;
alter table public.signatures add column if not exists user_agent_hash text;
alter table public.signatures add column if not exists accepted_at timestamptz;

update public.signatures
set status=case when coalesce(verified,false) then 'accepted' else 'pending' end
where status is null;
update public.signatures set email_verified_at=verified_at where email_verified_at is null and verified_at is not null;
update public.signatures set accepted_at=coalesce(verified_at,created_at) where accepted_at is null and status='accepted';
update public.signatures set session_hash='legacy:'||id where session_hash is null;

alter table public.signatures alter column status set default 'pending';
alter table public.signatures alter column status set not null;
alter table public.signatures alter column session_hash set not null;

alter table public.signatures drop constraint if exists signatures_email_key;
alter table public.signatures drop constraint if exists signatures_verify_token_hash_key;

drop index if exists signatures_email_unique_idx;
drop index if exists signatures_session_active_unique_idx;
create unique index if not exists signatures_email_active_unique_idx on public.signatures (email) where email is not null and status in ('accepted','pending');
create unique index if not exists signatures_session_active_unique_idx on public.signatures (session_hash) where status in ('accepted','pending');
create index if not exists signatures_status_idx on public.signatures (status);
create index if not exists signatures_user_agent_hash_idx on public.signatures (user_agent_hash);
create index if not exists signatures_email_verified_idx on public.signatures (email_verified_at) where email_verified_at is not null;

create table if not exists public.petition_stats (
  id text primary key,
  accepted_count bigint not null default 0,
  email_verified_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.petition_stats (id, accepted_count, email_verified_count)
select 'global',count(*) filter (where status='accepted'),count(*) filter (where status='accepted' and email_verified_at is not null)
from public.signatures
on conflict (id) do update set accepted_count=excluded.accepted_count,email_verified_count=excluded.email_verified_count,updated_at=now();

create or replace function public.sync_petition_stats()
returns trigger language plpgsql as $$
declare
  old_accepted integer := 0; new_accepted integer := 0;
  old_verified integer := 0; new_verified integer := 0;
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
end; $$;

drop trigger if exists signatures_stats_trigger on public.signatures;
create trigger signatures_stats_trigger after insert or update or delete on public.signatures
for each row execute function public.sync_petition_stats();
