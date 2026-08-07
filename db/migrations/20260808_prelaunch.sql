alter table public.signatures add column if not exists source text;
alter table public.signatures add column if not exists referral_code text;
alter table public.signatures add column if not exists referrer_code text;
alter table public.signatures add column if not exists locale text;
alter table public.signatures add column if not exists turnstile_verified_at timestamptz;

alter table public.petition_internal add column if not exists admin_token_hash text;
-- Set admin_token_hash separately in production. Never commit the raw admin token.

create unique index if not exists signatures_referral_code_unique_idx on public.signatures (referral_code) where referral_code is not null;
create index if not exists signatures_status_created_idx on public.signatures (status, created_at desc);
create index if not exists signatures_source_accepted_idx on public.signatures (source) where status='accepted';
create index if not exists signatures_country_accepted_idx on public.signatures (country) where status='accepted' and country is not null;
create index if not exists signatures_locale_accepted_idx on public.signatures (locale) where status='accepted' and locale is not null;
create index if not exists signatures_referrer_accepted_idx on public.signatures (referrer_code) where status='accepted' and referrer_code is not null;
create index if not exists signatures_turnstile_idx on public.signatures (turnstile_verified_at) where turnstile_verified_at is not null;

create or replace function public.get_petition_admin_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'generatedAt', now(),
    'global', jsonb_build_object(
      'accepted', coalesce((select accepted_count from public.petition_stats where id='global'),0),
      'emailVerified', coalesce((select email_verified_count from public.petition_stats where id='global'),0),
      'pending', (select count(*) from public.signatures where status='pending'),
      'rejected', (select count(*) from public.signatures where status='rejected'),
      'total', (select count(*) from public.signatures),
      'emailProvided', (select count(*) from public.signatures where email is not null),
      'updatesOptIn', (select count(*) from public.signatures where updates_opt_in is true),
      'turnstileVerified', (select count(*) from public.signatures where turnstile_verified_at is not null),
      'last24h', (select count(*) from public.signatures where status='accepted' and created_at >= now() - interval '24 hours'),
      'lastHour', (select count(*) from public.signatures where status='accepted' and created_at >= now() - interval '1 hour'),
      'avgRisk', coalesce((select round(avg(risk_score)::numeric,1) from public.signatures where status in ('accepted','pending')),0)
    ),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day',day,'accepted',accepted,'pending',pending,'verified',verified) order by day) from (select created_at::date day,count(*) filter(where status='accepted') accepted,count(*) filter(where status='pending') pending,count(*) filter(where status='accepted' and email_verified_at is not null) verified from public.signatures where created_at >= current_date - interval '13 days' group by created_at::date)d),'[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('value',value,'accepted',accepted) order by accepted desc,value) from (select coalesce(nullif(source,''),'direct') value,count(*) accepted from public.signatures where status='accepted' group by 1 order by 2 desc limit 20)s),'[]'::jsonb),
    'countries', coalesce((select jsonb_agg(jsonb_build_object('value',value,'accepted',accepted) order by accepted desc,value) from (select coalesce(nullif(country,''),'Non précisé') value,count(*) accepted from public.signatures where status='accepted' group by 1 order by 2 desc limit 20)c),'[]'::jsonb),
    'locales', coalesce((select jsonb_agg(jsonb_build_object('value',value,'accepted',accepted) order by accepted desc,value) from (select coalesce(nullif(locale,''),'unknown') value,count(*) accepted from public.signatures where status='accepted' group by 1 order by 2 desc limit 10)l),'[]'::jsonb),
    'referrals', coalesce((select jsonb_agg(jsonb_build_object('code',referrer_code,'accepted',accepted) order by accepted desc,referrer_code) from (select referrer_code,count(*) accepted from public.signatures where status='accepted' and referrer_code is not null group by referrer_code order by 2 desc limit 20)r),'[]'::jsonb),
    'risk', jsonb_build_object('low',(select count(*) from public.signatures where status in ('accepted','pending') and risk_score<30),'medium',(select count(*) from public.signatures where status in ('accepted','pending') and risk_score between 30 and 59),'high',(select count(*) from public.signatures where status in ('accepted','pending') and risk_score>=60))
  );
$$;
revoke all on function public.get_petition_admin_stats() from public, anon, authenticated;
