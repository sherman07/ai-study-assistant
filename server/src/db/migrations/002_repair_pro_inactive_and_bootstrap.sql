-- Repair inconsistent billing rows and ensure the primary controller role.
-- Pro plans must not remain stuck on the schema default subscription_status
-- of `inactive` (that blocks hasActivePro / entitlements).

update public.users
set
  subscription_status = 'active',
  current_period_end = coalesce(
    current_period_end,
    case
      when plan = 'pro_yearly' then timezone('utc', now()) + interval '1 year'
      else timezone('utc', now()) + interval '1 month'
    end
  ),
  updated_at = timezone('utc', now())
where plan like 'pro_%'
  and lower(coalesce(subscription_status, 'inactive')) = 'inactive';

-- Free accounts that accidentally show an active subscription status.
update public.users
set
  subscription_status = 'inactive',
  updated_at = timezone('utc', now())
where plan = 'free'
  and lower(coalesce(subscription_status, '')) in ('active', 'trialing');

-- Primary bootstrap controller.
update public.users
set platform_role = 'controller'
where lower(trim(email)) = 'shermanzheng8@gmail.com'
  and platform_role is distinct from 'controller';

insert into public.site_access_allowlist (email, note, granted_by_email)
values ('shermanzheng8@gmail.com', 'Primary controller', 'system')
on conflict (email) do nothing;
