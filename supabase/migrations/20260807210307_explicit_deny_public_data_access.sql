create policy deny_anon_authenticated_signatures on public.signatures for all to anon, authenticated using (false) with check (false);
create policy deny_anon_authenticated_petition_stats on public.petition_stats for all to anon, authenticated using (false) with check (false);
create policy deny_anon_authenticated_petition_internal on public.petition_internal for all to anon, authenticated using (false) with check (false);
