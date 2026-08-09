-- Admin user controls + credit metadata contract for Synapse.
-- Apply in Supabase SQL Editor after 001_admin_controller_access.sql.
-- Credits and feature gates live in public.users.metadata_json (jsonb).
-- This migration documents the contract, adds indexes, and optional helpers.

-- Ensure billing columns exist on older projects.
alter table public.users
  add column if not exists plan text not null default 'free';

alter table public.users
  add column if not exists subscription_status text not null default 'inactive';

alter table public.users
  add column if not exists current_period_end timestamptz;

alter table public.users
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

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

create index if not exists users_plan_status_idx
  on public.users (plan, subscription_status);

create index if not exists users_platform_role_idx
  on public.users (platform_role);

-- Fast lookup for admin_controls / credit keys inside metadata_json.
create index if not exists users_metadata_json_gin_idx
  on public.users using gin (metadata_json jsonb_path_ops);

-- Convenience expressions for dashboards (read-only generated view).
create or replace view public.synapse_user_billing_overview
with (security_invoker = true)
as
select
  u.id,
  u.email,
  u.display_name,
  u.platform_role,
  u.plan,
  u.subscription_status,
  u.current_period_end,
  coalesce((u.metadata_json ->> 'daily_credits')::integer, 0) as daily_credits,
  coalesce((u.metadata_json ->> 'boost_credits')::integer, 0) as boost_credits,
  coalesce((u.metadata_json ->> 'credits')::integer,
    coalesce((u.metadata_json ->> 'daily_credits')::integer, 0)
    + coalesce((u.metadata_json ->> 'boost_credits')::integer, 0)
  ) as total_credits,
  (u.metadata_json ->> 'daily_refreshed_on') as daily_refreshed_on,
  (u.metadata_json ->> 'admin_daily_allowance')::integer as admin_daily_allowance,
  coalesce(u.metadata_json -> 'admin_controls' ->> 'accountStatus', 'active') as account_status,
  u.metadata_json -> 'admin_controls' as admin_controls,
  u.created_at,
  u.updated_at
from public.users u;

revoke all on public.synapse_user_billing_overview from anon, authenticated;
grant select on public.synapse_user_billing_overview to service_role;

comment on column public.users.metadata_json is
  'Credit ledger + controller overrides. Keys: credits, daily_credits, boost_credits, daily_refreshed_on, welcome_granted, admin_daily_allowance, admin_controls{accountStatus,notes,features,updatedAt}.';

comment on view public.synapse_user_billing_overview is
  'Controller-facing billing overview derived from users.metadata_json. Service-role only.';

-- Seed default platform settings used by controller tools.
insert into public.platform_settings (key, value_json)
values
  ('site_access_mode', '"open"'::jsonb),
  ('signup_open', 'true'::jsonb)
on conflict (key) do nothing;

-- Keep primary controller elevated.
update public.users
set platform_role = 'controller'
where lower(trim(email)) = 'shermanzheng8@gmail.com';

insert into public.site_access_allowlist (email, note, granted_by_email)
values ('shermanzheng8@gmail.com', 'Primary controller', 'system')
on conflict (email) do nothing;
