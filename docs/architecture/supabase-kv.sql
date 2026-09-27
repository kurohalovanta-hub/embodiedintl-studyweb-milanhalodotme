-- Storage for HALO accounts, progress and the tutor bridge on Supabase.
-- Run once in the Supabase SQL editor. Safe to run again.

create table if not exists public.kv (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz
);
alter table public.kv enable row level security;

create or replace function public.kv_set_nx(k text, v jsonb, ttl_seconds int default null)
returns boolean language plpgsql as $$
declare n int;
begin
  delete from public.kv where key = k and expires_at is not null and expires_at < now();
  insert into public.kv(key, value, expires_at)
  values (k, v, case when ttl_seconds is null then null
                     else now() + make_interval(secs => ttl_seconds) end)
  on conflict (key) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function public.kv_incr(k text, ttl_seconds int default null)
returns bigint language plpgsql as $$
declare n bigint;
begin
  delete from public.kv where key = k and expires_at is not null and expires_at < now();
  insert into public.kv(key, value, expires_at)
  values (k, '1'::jsonb, case when ttl_seconds is null then null
                              else now() + make_interval(secs => ttl_seconds) end)
  on conflict (key) do update
    set value = to_jsonb((public.kv.value #>> '{}')::bigint + 1)
  returning (value #>> '{}')::bigint into n;
  return n;
end $$;

create or replace function public.kv_sadd(k text, member text)
returns void language sql as $$
  insert into public.kv(key, value) values (k, jsonb_build_array(member))
  on conflict (key) do update
    set value = case when public.kv.value ? member then public.kv.value
                     else public.kv.value || to_jsonb(member) end;
$$;

create or replace function public.kv_srem(k text, member text)
returns void language sql as $$
  update public.kv set value = value - member where key = k;
$$;

-- lists: jsonb arrays, head first
create or replace function public.kv_push(k text, vals jsonb, at_head boolean)
returns bigint language plpgsql as $$
declare n bigint;
begin
  delete from public.kv where key = k and expires_at is not null and expires_at < now();
  insert into public.kv(key, value) values (k, vals)
  on conflict (key) do update
    set value = case when at_head then vals || public.kv.value
                     else public.kv.value || vals end
  returning jsonb_array_length(value) into n;
  return n;
end $$;

create or replace function public.kv_pop(k text, n int, from_head boolean)
returns jsonb language plpgsql as $$
declare cur jsonb; len int; taken jsonb; rest jsonb;
begin
  delete from public.kv where key = k and expires_at is not null and expires_at < now();
  select value into cur from public.kv where key = k for update;
  if cur is null or jsonb_typeof(cur) <> 'array' then return '[]'::jsonb; end if;
  len := jsonb_array_length(cur);
  if len = 0 then return '[]'::jsonb; end if;
  if n > len then n := len; end if;
  if from_head then
    select coalesce(jsonb_agg(e order by i), '[]'::jsonb) into taken
      from jsonb_array_elements(cur) with ordinality as t(e, i) where i <= n;
    select coalesce(jsonb_agg(e order by i), '[]'::jsonb) into rest
      from jsonb_array_elements(cur) with ordinality as t(e, i) where i > n;
  else
    select coalesce(jsonb_agg(e order by i desc), '[]'::jsonb) into taken
      from jsonb_array_elements(cur) with ordinality as t(e, i) where i > len - n;
    select coalesce(jsonb_agg(e order by i), '[]'::jsonb) into rest
      from jsonb_array_elements(cur) with ordinality as t(e, i) where i <= len - n;
  end if;
  if jsonb_array_length(rest) = 0 then
    delete from public.kv where key = k;
  else
    update public.kv set value = rest where key = k;
  end if;
  return taken;
end $$;

-- housekeeping: call now and then to drop expired rows
create or replace function public.kv_sweep()
returns bigint language plpgsql as $$
declare n bigint;
begin
  delete from public.kv where expires_at is not null and expires_at < now();
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.kv_set_nx(text, jsonb, int) from anon, authenticated;
revoke all on function public.kv_incr(text, int) from anon, authenticated;
revoke all on function public.kv_sadd(text, text) from anon, authenticated;
revoke all on function public.kv_srem(text, text) from anon, authenticated;
revoke all on function public.kv_push(text, jsonb, boolean) from anon, authenticated;
revoke all on function public.kv_pop(text, int, boolean) from anon, authenticated;
revoke all on function public.kv_sweep() from anon, authenticated;
