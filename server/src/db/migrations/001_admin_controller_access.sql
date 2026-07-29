-- Admin controller access: platform roles, site allowlist, platform settings.
-- Apply in Supabase SQL editor (or psql) against the Synapse public schema.

alter table public.users
  add column if not exists platform_role text not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_platform_role_check'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_platform_role_check
      check (platform_role in ('user', 'controller'));
  end if;
end $$;

create index if not exists users_platform_role_idx
  on public.users (platform_role);

-- Bootstrap the primary controller. Safe to re-run.
update public.users
set platform_role = 'controller'
where lower(trim(email)) = 'shermanzheng8@gmail.com';

create table if not exists public.platform_settings (
  key text primary key,
  value_json jsonb not null default '{}'::jsonb,
  updated_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists platform_settings_set_updated_at on public.platform_settings;
create trigger platform_settings_set_updated_at
before update on public.platform_settings
for each row
execute function public.synapse_set_updated_at();

insert into public.platform_settings (key, value_json)
values
  ('site_access_mode', '"open"'::jsonb),
  ('signup_open', 'true'::jsonb)
on conflict (key) do nothing;

create table if not exists public.site_access_allowlist (
  email text primary key,
  note text,
  granted_by_user_id text,
  granted_by_email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists site_access_allowlist_created_idx
  on public.site_access_allowlist (created_at desc);

drop trigger if exists site_access_allowlist_set_updated_at on public.site_access_allowlist;
create trigger site_access_allowlist_set_updated_at
before update on public.site_access_allowlist
for each row
execute function public.synapse_set_updated_at();

-- Controllers always retain site access even when allowlist mode is on.
insert into public.site_access_allowlist (email, note, granted_by_email)
values ('shermanzheng8@gmail.com', 'Primary controller', 'system')
on conflict (email) do nothing;

grant select, insert, update, delete on table
  public.platform_settings,
  public.site_access_allowlist
to authenticated, service_role;

alter table public.platform_settings enable row level security;
alter table public.site_access_allowlist enable row level security;

-- Browser clients must not read/write these tables directly; the Express
-- service role handles all admin operations.
drop policy if exists platform_settings_no_direct_access on public.platform_settings;
create policy platform_settings_no_direct_access
  on public.platform_settings
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists site_access_allowlist_no_direct_access on public.site_access_allowlist;
create policy site_access_allowlist_no_direct_access
  on public.site_access_allowlist
  for all
  to authenticated
  using (false)
  with check (false);
