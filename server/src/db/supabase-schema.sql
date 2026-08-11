create or replace function public.synapse_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id text primary key,
  auth_provider text not null,
  auth_subject text not null,
  email text,
  display_name text,
  auth_mode text,
  role text not null default 'student',
  platform_role text not null default 'user'
    check (platform_role in ('user', 'controller')),
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  subscription_status text not null default 'inactive',
  current_period_end timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists users_auth_provider_subject_idx
  on public.users (auth_provider, auth_subject);

create index if not exists users_email_idx
  on public.users (email);

create index if not exists users_stripe_customer_idx
  on public.users (stripe_customer_id);

create index if not exists users_stripe_subscription_idx
  on public.users (stripe_subscription_id);

create index if not exists users_plan_status_idx
  on public.users (plan, subscription_status);

create index if not exists users_platform_role_idx
  on public.users (platform_role);

create index if not exists users_metadata_json_gin_idx
  on public.users using gin (metadata_json jsonb_path_ops);

comment on column public.users.metadata_json is
  'Credit ledger + controller overrides. Keys: credits, daily_credits, boost_credits, daily_refreshed_on, welcome_granted, admin_daily_allowance, admin_controls{accountStatus,notes,features,updatedAt}.';

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.synapse_set_updated_at();

-- Primary bootstrap controller (also enforced in app config).
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

insert into public.site_access_allowlist (email, note, granted_by_email)
values ('shermanzheng8@gmail.com', 'Primary controller', 'system')
on conflict (email) do nothing;

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

create table if not exists public.generated_contents (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  source_fingerprint text not null,
  client_fingerprint text,
  title text,
  summary text not null,
  language text,
  detail_level text,
  prompt_mode text,
  source_count integer not null default 0,
  cached boolean not null default false,
  sections_json jsonb not null default '{}'::jsonb,
  connections_json jsonb not null default '[]'::jsonb,
  mind_map_json jsonb not null default '{}'::jsonb,
  visual_gallery_json jsonb not null default '[]'::jsonb,
  sources_json jsonb not null default '[]'::jsonb,
  full_result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists generated_contents_user_fingerprint_idx
  on public.generated_contents (user_id, source_fingerprint);

create index if not exists generated_contents_user_updated_idx
  on public.generated_contents (user_id, updated_at desc);

create index if not exists generated_contents_fingerprint_idx
  on public.generated_contents (source_fingerprint);

drop trigger if exists generated_contents_set_updated_at on public.generated_contents;
create trigger generated_contents_set_updated_at
before update on public.generated_contents
for each row
execute function public.synapse_set_updated_at();

CREATE TABLE IF NOT EXISTS public.broadcast_jobs (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  source_id text,
  note_id text,
  source_fingerprint text,
  title text not null default 'AI Broadcast',
  status text not null default 'queued'
    check (status in (
      'queued',
      'extracting_source',
      'planning',
      'scripting',
      'validating',
      'generating_audio',
      'building_audio',
      'completed',
      'failed',
      'cancelled'
    )),
  style text not null default 'calm_study_narrator',
  length_minutes integer not null default 5,
  custom_length_minutes integer,
  voice_format text not null default 'two_ai_hosts',
  depth text not null default 'standard',
  language text not null default 'auto',
  progress_message text,
  progress_percent integer not null default 0,
  script_model text not null default 'gpt-5.4-mini',
  tts_provider text not null default 'openai',
  tts_model text not null default 'gpt-4o-mini-tts',
  plan_json jsonb not null default '{}'::jsonb,
  script_json jsonb not null default '{}'::jsonb,
  validation_json jsonb not null default '{}'::jsonb,
  transcript_json jsonb not null default '[]'::jsonb,
  chapters_json jsonb not null default '[]'::jsonb,
  key_ideas_json jsonb not null default '[]'::jsonb,
  source_references_json jsonb not null default '[]'::jsonb,
  audio_url text,
  audio_metadata_json jsonb not null default '{}'::jsonb,
  error_message text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists broadcast_jobs_user_updated_idx
  on public.broadcast_jobs (user_id, updated_at desc);

create index if not exists broadcast_jobs_status_idx
  on public.broadcast_jobs (status, updated_at desc);

create index if not exists broadcast_jobs_note_idx
  on public.broadcast_jobs (note_id);

drop trigger if exists broadcast_jobs_set_updated_at on public.broadcast_jobs;
create trigger broadcast_jobs_set_updated_at
before update on public.broadcast_jobs
for each row
execute function public.synapse_set_updated_at();

create table if not exists public.study_rooms (
  id text primary key,
  owner_user_id text not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  visibility text not null default 'private'
    check (visibility in ('private', 'shared', 'public')),
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists study_rooms_owner_updated_idx
  on public.study_rooms (owner_user_id, updated_at desc);

drop trigger if exists study_rooms_set_updated_at on public.study_rooms;
create trigger study_rooms_set_updated_at
before update on public.study_rooms
for each row
execute function public.synapse_set_updated_at();

create table if not exists public.study_room_members (
  study_room_id text not null references public.study_rooms(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  role text not null default 'viewer'
    check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (study_room_id, user_id)
);

create index if not exists study_room_members_user_idx
  on public.study_room_members (user_id);

drop trigger if exists study_room_members_set_updated_at on public.study_room_members;
create trigger study_room_members_set_updated_at
before update on public.study_room_members
for each row
execute function public.synapse_set_updated_at();

create table if not exists public.focus_sessions (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  study_room_id text references public.study_rooms(id) on delete set null,
  generated_content_id text references public.generated_contents(id) on delete set null,
  material_id text,
  material_title text,
  study_goal text,
  status text not null default 'completed'
    check (status in ('planned', 'active', 'completed', 'cancelled')),
  focus_trail_date date,
  focus_timezone text,
  selected_scene text,
  music_type text,
  ambient_sound text,
  pomodoro_minutes integer,
  started_at timestamptz,
  ended_at timestamptz,
  total_focus_seconds integer not null default 0,
  metrics_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists focus_sessions_user_updated_idx
  on public.focus_sessions (user_id, updated_at desc);

create index if not exists focus_sessions_user_trail_date_idx
  on public.focus_sessions (user_id, focus_trail_date desc);

create index if not exists focus_sessions_room_idx
  on public.focus_sessions (study_room_id);

drop trigger if exists focus_sessions_set_updated_at on public.focus_sessions;
create trigger focus_sessions_set_updated_at
before update on public.focus_sessions
for each row
execute function public.synapse_set_updated_at();

create table if not exists public.flashcard_decks (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  generated_content_id text references public.generated_contents(id) on delete set null,
  study_room_id text references public.study_rooms(id) on delete set null,
  title text not null,
  language text,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists flashcard_decks_user_updated_idx
  on public.flashcard_decks (user_id, updated_at desc);

drop trigger if exists flashcard_decks_set_updated_at on public.flashcard_decks;
create trigger flashcard_decks_set_updated_at
before update on public.flashcard_decks
for each row
execute function public.synapse_set_updated_at();

create table if not exists public.flashcards (
  id text primary key,
  deck_id text not null references public.flashcard_decks(id) on delete cascade,
  front text not null,
  back text not null,
  hint text,
  source_reference text,
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  tags_json jsonb not null default '[]'::jsonb,
  card_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists flashcards_deck_order_idx
  on public.flashcards (deck_id, card_order, created_at);

drop trigger if exists flashcards_set_updated_at on public.flashcards;
create trigger flashcards_set_updated_at
before update on public.flashcards
for each row
execute function public.synapse_set_updated_at();

create table if not exists public.progress_records (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  study_room_id text references public.study_rooms(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  metric_type text not null,
  score numeric(8,3),
  status text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists progress_records_user_updated_idx
  on public.progress_records (user_id, updated_at desc);

create index if not exists progress_records_entity_idx
  on public.progress_records (entity_type, entity_id);

drop trigger if exists progress_records_set_updated_at on public.progress_records;
create trigger progress_records_set_updated_at
before update on public.progress_records
for each row
execute function public.synapse_set_updated_at();

revoke all privileges on table
  public.users,
  public.generated_contents,
  public.broadcast_jobs,
  public.study_rooms,
  public.study_room_members,
  public.focus_sessions,
  public.flashcard_decks,
  public.flashcards,
  public.progress_records,
  public.platform_settings,
  public.site_access_allowlist
from anon, authenticated, service_role;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on table
  public.users,
  public.generated_contents,
  public.broadcast_jobs,
  public.study_rooms,
  public.study_room_members,
  public.focus_sessions,
  public.flashcard_decks,
  public.flashcards,
  public.progress_records,
  public.platform_settings,
  public.site_access_allowlist
to authenticated, service_role;

grant execute on function public.synapse_set_updated_at() to service_role;

alter table public.users enable row level security;
alter table public.platform_settings enable row level security;
alter table public.site_access_allowlist enable row level security;
alter table public.generated_contents enable row level security;
alter table public.broadcast_jobs enable row level security;
alter table public.study_rooms enable row level security;
alter table public.study_room_members enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;
alter table public.progress_records enable row level security;

drop policy if exists users_own_rows_select on public.users;
create policy users_own_rows_select
on public.users for select
to authenticated
using (auth_provider = 'supabase' and auth_subject = (select auth.uid())::text);

drop policy if exists users_own_rows_insert on public.users;
create policy users_own_rows_insert
on public.users for insert
to authenticated
with check (auth_provider = 'supabase' and auth_subject = (select auth.uid())::text);

drop policy if exists users_own_rows_update on public.users;
create policy users_own_rows_update
on public.users for update
to authenticated
using (auth_provider = 'supabase' and auth_subject = (select auth.uid())::text)
with check (auth_provider = 'supabase' and auth_subject = (select auth.uid())::text);

drop policy if exists users_own_rows_delete on public.users;
create policy users_own_rows_delete
on public.users for delete
to authenticated
using (auth_provider = 'supabase' and auth_subject = (select auth.uid())::text);

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

drop policy if exists generated_contents_owner_access on public.generated_contents;
create policy generated_contents_owner_access
on public.generated_contents
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = generated_contents.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = generated_contents.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
);

drop policy if exists broadcast_jobs_owner_access on public.broadcast_jobs;
create policy broadcast_jobs_owner_access
on public.broadcast_jobs
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = broadcast_jobs.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = broadcast_jobs.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
);

drop policy if exists study_rooms_owner_access on public.study_rooms;
create policy study_rooms_owner_access
on public.study_rooms
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = study_rooms.owner_user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = study_rooms.owner_user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
);

drop policy if exists study_room_members_related_access on public.study_room_members;
create policy study_room_members_related_access
on public.study_room_members
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = study_room_members.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
  or exists (
    select 1
    from public.study_rooms r
    join public.users u on u.id = r.owner_user_id
    where r.id = study_room_members.study_room_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1
    from public.study_rooms r
    join public.users u on u.id = r.owner_user_id
    where r.id = study_room_members.study_room_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
);

drop policy if exists focus_sessions_owner_access on public.focus_sessions;
create policy focus_sessions_owner_access
on public.focus_sessions
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = focus_sessions.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = focus_sessions.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
);

drop policy if exists flashcard_decks_owner_access on public.flashcard_decks;
create policy flashcard_decks_owner_access
on public.flashcard_decks
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = flashcard_decks.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = flashcard_decks.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
);

drop policy if exists flashcards_deck_owner_access on public.flashcards;
create policy flashcards_deck_owner_access
on public.flashcards
to authenticated
using (
  exists (
    select 1
    from public.flashcard_decks d
    join public.users u on u.id = d.user_id
    where d.id = flashcards.deck_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1
    from public.flashcard_decks d
    join public.users u on u.id = d.user_id
    where d.id = flashcards.deck_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
);

drop policy if exists progress_records_owner_access on public.progress_records;
create policy progress_records_owner_access
on public.progress_records
to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = progress_records.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = progress_records.user_id
      and u.auth_provider = 'supabase'
      and u.auth_subject = (select auth.uid())::text
  )
);

create table if not exists public.learner_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  memory_enabled boolean not null default true,
  preferences_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.learning_subjects (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  intention text not null check (intention in ('hobby', 'skill', 'project', 'assessment')),
  goal text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  summary text,
  current_session_id text,
  current_unit_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists learning_subjects_user_updated_idx
  on public.learning_subjects (user_id, updated_at desc);

create table if not exists public.learning_sessions (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  subject_id text not null references public.learning_subjects(id) on delete cascade,
  available_time_minutes integer not null default 0 check (available_time_minutes between 0 and 480),
  active_objective text,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists learning_sessions_subject_updated_idx
  on public.learning_sessions (subject_id, updated_at desc);

create index if not exists learning_sessions_user_updated_idx
  on public.learning_sessions (user_id, updated_at desc);

create table if not exists public.learning_messages (
  id text primary key,
  session_id text not null references public.learning_sessions(id) on delete cascade,
  sequence_number integer not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  turn_status text not null default 'complete' check (turn_status in ('complete', 'pending', 'failed')),
  idempotency_key text,
  decision_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_id, sequence_number),
  unique (session_id, idempotency_key)
);

create table if not exists public.learning_evidence (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  subject_id text not null references public.learning_subjects(id) on delete cascade,
  session_id text references public.learning_sessions(id) on delete set null,
  evidence_type text not null check (evidence_type in ('self_check', 'practice', 'project', 'assessment')),
  status text not null default 'recorded' check (status in ('recorded', 'verified')),
  label text not null,
  score integer check (score between 0 and 100),
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists learning_evidence_subject_created_idx
  on public.learning_evidence (subject_id, created_at desc);

create index if not exists learning_evidence_user_created_idx
  on public.learning_evidence (user_id, created_at desc);

drop trigger if exists learner_profiles_set_updated_at on public.learner_profiles;
create trigger learner_profiles_set_updated_at before update on public.learner_profiles
for each row execute function public.synapse_set_updated_at();

drop trigger if exists learning_subjects_set_updated_at on public.learning_subjects;
create trigger learning_subjects_set_updated_at before update on public.learning_subjects
for each row execute function public.synapse_set_updated_at();

drop trigger if exists learning_sessions_set_updated_at on public.learning_sessions;
create trigger learning_sessions_set_updated_at before update on public.learning_sessions
for each row execute function public.synapse_set_updated_at();

alter table public.learner_profiles enable row level security;
alter table public.learning_subjects enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.learning_messages enable row level security;
alter table public.learning_evidence enable row level security;

drop policy if exists learner_profiles_owner_access on public.learner_profiles;
create policy learner_profiles_owner_access on public.learner_profiles to authenticated
using (exists (select 1 from public.users u where u.id = learner_profiles.user_id and u.auth_provider = 'supabase' and u.auth_subject = (select auth.uid())::text))
with check (exists (select 1 from public.users u where u.id = learner_profiles.user_id and u.auth_provider = 'supabase' and u.auth_subject = (select auth.uid())::text));

drop policy if exists learning_subjects_owner_access on public.learning_subjects;
create policy learning_subjects_owner_access on public.learning_subjects to authenticated
using (exists (select 1 from public.users u where u.id = learning_subjects.user_id and u.auth_provider = 'supabase' and u.auth_subject = (select auth.uid())::text))
with check (exists (select 1 from public.users u where u.id = learning_subjects.user_id and u.auth_provider = 'supabase' and u.auth_subject = (select auth.uid())::text));

drop policy if exists learning_sessions_owner_access on public.learning_sessions;
create policy learning_sessions_owner_access on public.learning_sessions to authenticated
using (exists (select 1 from public.users u where u.id = learning_sessions.user_id and u.auth_provider = 'supabase' and u.auth_subject = (select auth.uid())::text))
with check (exists (select 1 from public.users u where u.id = learning_sessions.user_id and u.auth_provider = 'supabase' and u.auth_subject = (select auth.uid())::text));

drop policy if exists learning_messages_session_owner_access on public.learning_messages;
create policy learning_messages_session_owner_access on public.learning_messages to authenticated
using (exists (select 1 from public.learning_sessions s join public.users u on u.id = s.user_id where s.id = learning_messages.session_id and u.auth_provider = 'supabase' and u.auth_subject = (select auth.uid())::text))
with check (exists (select 1 from public.learning_sessions s join public.users u on u.id = s.user_id where s.id = learning_messages.session_id and u.auth_provider = 'supabase' and u.auth_subject = (select auth.uid())::text));

drop policy if exists learning_evidence_owner_access on public.learning_evidence;
create policy learning_evidence_owner_access on public.learning_evidence to authenticated
using (exists (select 1 from public.users u where u.id = learning_evidence.user_id and u.auth_provider = 'supabase' and u.auth_subject = (select auth.uid())::text))
with check (exists (select 1 from public.users u where u.id = learning_evidence.user_id and u.auth_provider = 'supabase' and u.auth_subject = (select auth.uid())::text));
