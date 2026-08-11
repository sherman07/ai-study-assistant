-- Focus Trail is keyed by the local calendar day chosen on the user's device.
-- Existing focus-session ownership and RLS policies continue to govern these columns.
alter table public.focus_sessions
  add column if not exists focus_trail_date date,
  add column if not exists focus_timezone text;

create index if not exists focus_sessions_user_trail_date_idx
  on public.focus_sessions (user_id, focus_trail_date desc);

comment on column public.focus_sessions.focus_trail_date is
  'User-local calendar date captured when entering the Focus Room (YYYY-MM-DD).';

comment on column public.focus_sessions.focus_timezone is
  'IANA timezone captured with the Focus Trail day, for example Pacific/Auckland.';
