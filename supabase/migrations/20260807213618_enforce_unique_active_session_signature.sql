create unique index if not exists signatures_active_session_unique
on public.signatures(session_hash)
where session_hash is not null and status in ('accepted','pending');
