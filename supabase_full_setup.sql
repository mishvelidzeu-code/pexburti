begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists private;
revoke all on schema private from public;

do $$
begin
  create type public.user_role as enum ('player', 'parent', 'agent', 'scout', 'academy', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.player_position as enum ('goalkeeper', 'defender', 'midfielder', 'forward', 'unknown');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.preferred_foot as enum ('right', 'left', 'both', 'unknown');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.video_visibility as enum ('private', 'scout_only', 'public');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.content_access as enum ('free', 'premium');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.vote_category as enum ('goal', 'save', 'skill', 'moment');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.vote_status as enum ('draft', 'live', 'closed', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_plan_code as enum ('free', 'premium');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.link_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.scout_note_status as enum ('new', 'watch', 'follow_up', 'signed');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext unique,
  role public.user_role not null default 'player',
  first_name text,
  last_name text,
  full_name text,
  phone text,
  avatar_path text,
  country text not null default 'Georgia',
  city text,
  is_diaspora boolean not null default false,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  short_code text unique,
  name text not null,
  city text,
  country text not null default 'Georgia',
  age_band text,
  coach_name text,
  players_count integer not null default 0 check (players_count >= 0),
  contact_email citext,
  phone text,
  logo_path text,
  summary text,
  is_public boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.player_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text,
  avatar_path text,
  age integer check (age between 4 and 45),
  age_group text generated always as (
    case
      when age is null then null
      when age <= 10 then 'U10'
      when age <= 12 then 'U12'
      when age <= 14 then 'U14'
      when age <= 16 then 'U16'
      when age <= 18 then 'U18'
      when age <= 21 then 'U21'
      else 'PRO'
    end
  ) stored,
  height_cm numeric(5,2) check (height_cm is null or height_cm > 0),
  weight_kg numeric(5,2) check (weight_kg is null or weight_kg > 0),
  primary_position public.player_position,
  secondary_position public.player_position,
  position_label text,
  preferred_foot public.preferred_foot default 'unknown',
  current_club_id uuid references public.clubs (id) on delete set null,
  current_club_name text,
  shirt_number integer check (shirt_number between 1 and 99),
  country text not null default 'Georgia',
  city text,
  current_country text,
  is_legionnaire boolean not null default false,
  overall_rating numeric(5,2) check (overall_rating is null or (overall_rating >= 0 and overall_rating <= 100)),
  bio text,
  visibility_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.parent_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  relation_to_child text,
  child_full_name text,
  child_age integer check (child_age is null or child_age between 1 and 25),
  child_position public.player_position,
  child_position_label text,
  contact_phone text,
  secondary_phone text,
  bank_account_holder text,
  bank_name text,
  bank_iban text,
  billing_address text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agent_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  agency_name text,
  players_managed_count integer check (players_managed_count is null or players_managed_count >= 0),
  region text,
  focus_area text,
  license_number text,
  website text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.player_parent_links (
  player_id uuid not null references public.player_profiles (user_id) on delete cascade,
  parent_user_id uuid not null references public.parent_profiles (user_id) on delete cascade,
  relationship_label text not null default 'guardian',
  status public.link_status not null default 'pending',
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (player_id, parent_user_id)
);

create table if not exists public.agent_player_links (
  player_id uuid not null references public.player_profiles (user_id) on delete cascade,
  agent_user_id uuid not null references public.agent_profiles (user_id) on delete cascade,
  status public.link_status not null default 'pending',
  contract_start date,
  contract_end date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (player_id, agent_user_id)
);

create table if not exists public.player_season_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles (user_id) on delete cascade,
  club_id uuid references public.clubs (id) on delete set null,
  season_label text not null,
  competition_name text,
  age_group text,
  matches_played integer not null default 0 check (matches_played >= 0),
  goals integer not null default 0 check (goals >= 0),
  assists integer not null default 0 check (assists >= 0),
  minutes_played integer not null default 0 check (minutes_played >= 0),
  starts_count integer not null default 0 check (starts_count >= 0),
  clean_sheets integer not null default 0 check (clean_sheets >= 0),
  saves integer not null default 0 check (saves >= 0),
  yellow_cards integer not null default 0 check (yellow_cards >= 0),
  red_cards integer not null default 0 check (red_cards >= 0),
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.player_physical_tests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles (user_id) on delete cascade,
  test_date date not null default current_date,
  height_cm numeric(5,2) check (height_cm is null or height_cm > 0),
  weight_kg numeric(5,2) check (weight_kg is null or weight_kg > 0),
  sprint_10m_sec numeric(5,2) check (sprint_10m_sec is null or sprint_10m_sec > 0),
  sprint_30m_sec numeric(5,2) check (sprint_30m_sec is null or sprint_30m_sec > 0),
  vertical_jump_cm numeric(5,2) check (vertical_jump_cm is null or vertical_jump_cm > 0),
  agility_t_sec numeric(5,2) check (agility_t_sec is null or agility_t_sec > 0),
  yo_yo_distance_m integer check (yo_yo_distance_m is null or yo_yo_distance_m >= 0),
  top_speed_kmh numeric(5,2) check (top_speed_kmh is null or top_speed_kmh > 0),
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.video_highlights (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles (user_id) on delete cascade,
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  storage_path text not null unique,
  thumbnail_path text,
  visibility public.video_visibility not null default 'private',
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  is_featured boolean not null default false,
  share_slug text not null unique default encode(gen_random_bytes(6), 'hex'),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.learning_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.learning_lessons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.learning_categories (id) on delete set null,
  slug text not null unique,
  title text not null,
  summary text,
  body_markdown text,
  access_level public.content_access not null default 'premium',
  video_url text,
  asset_path text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscription_plans (
  code public.subscription_plan_code primary key,
  name text not null,
  price_monthly_gel numeric(10,2) not null default 0,
  video_limit integer,
  analytics_enabled boolean not null default false,
  learning_access boolean not null default false,
  priority_support boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_code public.subscription_plan_code not null references public.subscription_plans (code),
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  auto_renew boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null default current_date,
  age_group text not null,
  position_group text,
  metric_name text not null default 'overall_score',
  player_id uuid not null references public.player_profiles (user_id) on delete cascade,
  club_id uuid references public.clubs (id) on delete set null,
  rank_position integer not null check (rank_position > 0),
  metric_value numeric(10,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.voting_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category public.vote_category not null default 'goal',
  description text,
  status public.vote_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create table if not exists public.vote_nominees (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.voting_campaigns (id) on delete cascade,
  player_id uuid references public.player_profiles (user_id) on delete set null,
  highlight_id uuid references public.video_highlights (id) on delete set null,
  title text not null,
  description text,
  thumbnail_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.voting_campaigns (id) on delete cascade,
  nominee_id uuid not null references public.vote_nominees (id) on delete cascade,
  voter_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, voter_user_id)
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  icon_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  awarded_for text,
  awarded_by uuid references public.profiles (id) on delete set null,
  awarded_at timestamptz not null default timezone('utc', now()),
  unique (user_id, badge_id, awarded_for)
);

create table if not exists public.sponsor_rewards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sponsor_name text,
  description text,
  reward_type text not null,
  quantity_total integer not null default 0 check (quantity_total >= 0),
  quantity_claimed integer not null default 0 check (quantity_claimed >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.sponsor_rewards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'fulfilled', 'rejected')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.scout_notes (
  id uuid primary key default gen_random_uuid(),
  scout_user_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid not null references public.player_profiles (user_id) on delete cascade,
  organization_name text,
  note_status public.scout_note_status not null default 'new',
  rating numeric(5,2) check (rating is null or (rating >= 0 and rating <= 100)),
  notes text,
  is_shared_with_player boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_clubs_public on public.clubs (is_public, is_active);
create index if not exists idx_player_profiles_public on public.player_profiles (visibility_public, primary_position, age_group);
create index if not exists idx_player_profiles_club on public.player_profiles (current_club_id);
create index if not exists idx_player_parent_links_parent on public.player_parent_links (parent_user_id, status);
create index if not exists idx_agent_player_links_agent on public.agent_player_links (agent_user_id, status);
create index if not exists idx_player_season_stats_player on public.player_season_stats (player_id, season_label);
create index if not exists idx_player_physical_tests_player on public.player_physical_tests (player_id, test_date desc);
create index if not exists idx_video_highlights_player on public.video_highlights (player_id, created_at desc);
create index if not exists idx_video_highlights_visibility on public.video_highlights (visibility, published_at);
create index if not exists idx_learning_lessons_access on public.learning_lessons (access_level, is_published);
create index if not exists idx_user_subscriptions_user on public.user_subscriptions (user_id, plan_code, status);
create unique index if not exists idx_user_subscriptions_one_active on public.user_subscriptions (user_id)
  where status in ('trialing', 'active');
create index if not exists idx_leaderboard_snapshot on public.leaderboard_snapshots (snapshot_date, age_group, position_group);
create index if not exists idx_vote_nominees_campaign on public.vote_nominees (campaign_id, sort_order);
create index if not exists idx_votes_campaign on public.votes (campaign_id, nominee_id);
create index if not exists idx_user_badges_user on public.user_badges (user_id, awarded_at desc);
create index if not exists idx_reward_claims_reward on public.reward_claims (reward_id, status);
create index if not exists idx_scout_notes_player on public.scout_notes (player_id, created_at desc);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_clubs_updated_at on public.clubs;
create trigger trg_clubs_updated_at
before update on public.clubs
for each row execute function public.set_updated_at();

drop trigger if exists trg_player_profiles_updated_at on public.player_profiles;
create trigger trg_player_profiles_updated_at
before update on public.player_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_parent_profiles_updated_at on public.parent_profiles;
create trigger trg_parent_profiles_updated_at
before update on public.parent_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_agent_profiles_updated_at on public.agent_profiles;
create trigger trg_agent_profiles_updated_at
before update on public.agent_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_player_parent_links_updated_at on public.player_parent_links;
create trigger trg_player_parent_links_updated_at
before update on public.player_parent_links
for each row execute function public.set_updated_at();

drop trigger if exists trg_agent_player_links_updated_at on public.agent_player_links;
create trigger trg_agent_player_links_updated_at
before update on public.agent_player_links
for each row execute function public.set_updated_at();

drop trigger if exists trg_player_season_stats_updated_at on public.player_season_stats;
create trigger trg_player_season_stats_updated_at
before update on public.player_season_stats
for each row execute function public.set_updated_at();

drop trigger if exists trg_player_physical_tests_updated_at on public.player_physical_tests;
create trigger trg_player_physical_tests_updated_at
before update on public.player_physical_tests
for each row execute function public.set_updated_at();

drop trigger if exists trg_video_highlights_updated_at on public.video_highlights;
create trigger trg_video_highlights_updated_at
before update on public.video_highlights
for each row execute function public.set_updated_at();

drop trigger if exists trg_learning_categories_updated_at on public.learning_categories;
create trigger trg_learning_categories_updated_at
before update on public.learning_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_learning_lessons_updated_at on public.learning_lessons;
create trigger trg_learning_lessons_updated_at
before update on public.learning_lessons
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_subscriptions_updated_at on public.user_subscriptions;
create trigger trg_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists trg_voting_campaigns_updated_at on public.voting_campaigns;
create trigger trg_voting_campaigns_updated_at
before update on public.voting_campaigns
for each row execute function public.set_updated_at();

drop trigger if exists trg_sponsor_rewards_updated_at on public.sponsor_rewards;
create trigger trg_sponsor_rewards_updated_at
before update on public.sponsor_rewards
for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_claims_updated_at on public.reward_claims;
create trigger trg_reward_claims_updated_at
before update on public.reward_claims
for each row execute function public.set_updated_at();

drop trigger if exists trg_scout_notes_updated_at on public.scout_notes;
create trigger trg_scout_notes_updated_at
before update on public.scout_notes
for each row execute function public.set_updated_at();

create or replace function private.normalize_position(raw_value text)
returns public.player_position
language sql
immutable
as $$
  select case lower(trim(coalesce(raw_value, '')))
    when 'goalkeeper' then 'goalkeeper'::public.player_position
    when 'defender' then 'defender'::public.player_position
    when 'midfielder' then 'midfielder'::public.player_position
    when 'forward' then 'forward'::public.player_position
    when 'keeper' then 'goalkeeper'::public.player_position
    when 'winger' then 'forward'::public.player_position
    when 'striker' then 'forward'::public.player_position
    when 'მეკარე' then 'goalkeeper'::public.player_position
    when 'დამცველი' then 'defender'::public.player_position
    when 'ნახევარმცველი' then 'midfielder'::public.player_position
    when 'თავდამსხმელი' then 'forward'::public.player_position
    when 'ჯერ არ არის განსაზღვრული' then 'unknown'::public.player_position
    else 'unknown'::public.player_position
  end;
$$;

create or replace function private.normalize_foot(raw_value text)
returns public.preferred_foot
language sql
immutable
as $$
  select case lower(trim(coalesce(raw_value, '')))
    when 'right' then 'right'::public.preferred_foot
    when 'left' then 'left'::public.preferred_foot
    when 'both' then 'both'::public.preferred_foot
    when 'მარჯვენა' then 'right'::public.preferred_foot
    when 'მარცხენა' then 'left'::public.preferred_foot
    when 'ორივე' then 'both'::public.preferred_foot
    else 'unknown'::public.preferred_foot
  end;
$$;

create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role = 'admin'::public.user_role
    from public.profiles
    where id = auth.uid()
  ), false);
$$;

create or replace function private.is_parent_of_player(target_player uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.player_parent_links ppl
    where ppl.player_id = target_player
      and ppl.parent_user_id = auth.uid()
      and ppl.status = 'approved'
  );
$$;

create or replace function private.is_agent_for_player(target_player uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agent_player_links apl
    where apl.player_id = target_player
      and apl.agent_user_id = auth.uid()
      and apl.status = 'approved'
  );
$$;

create or replace function private.can_manage_player(target_player uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.uid() = target_player, false)
    or private.is_parent_of_player(target_player)
    or private.is_agent_for_player(target_player)
    or private.is_admin();
$$;

create or replace function private.can_view_player(target_player uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.can_manage_player(target_player)
    or exists (
      select 1
      from public.player_profiles pp
      where pp.user_id = target_player
        and pp.visibility_public = true
    )
    or coalesce(private.current_user_role(), 'player'::public.user_role) = any (
      array['scout'::public.user_role, 'academy'::public.user_role, 'admin'::public.user_role]
    );
$$;

create or replace function private.has_active_premium(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_subscriptions us
    where us.user_id = target_user
      and us.plan_code = 'premium'
      and us.status in ('trialing', 'active')
      and (us.ends_at is null or us.ends_at > timezone('utc', now()))
  );
$$;

create or replace function private.player_has_premium_access(target_player uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select private.has_active_premium(auth.uid())
    or private.has_active_premium(target_player)
    or exists (
      select 1
      from public.player_parent_links ppl
      join public.user_subscriptions us
        on us.user_id = ppl.parent_user_id
       and us.plan_code = 'premium'
       and us.status in ('trialing', 'active')
       and (us.ends_at is null or us.ends_at > timezone('utc', now()))
      where ppl.player_id = target_player
        and ppl.status = 'approved'
    );
$$;

create or replace function private.can_create_highlight(target_player uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and private.can_manage_player(target_player)
    and (
      private.player_has_premium_access(target_player)
      or (
        select count(*)
        from public.video_highlights vh
        where vh.player_id = target_player
      ) < 3
    );
$$;

create or replace function private.can_read_highlight_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.video_highlights vh
    where (vh.storage_path = object_name or vh.thumbnail_path = object_name)
      and (
        vh.visibility = 'public'
        or vh.owner_user_id = auth.uid()
        or private.can_manage_player(vh.player_id)
        or (
          vh.visibility = 'scout_only'
          and coalesce(private.current_user_role(), 'player'::public.user_role) = any (
            array['scout'::public.user_role, 'academy'::public.user_role, 'admin'::public.user_role]
          )
        )
      )
  );
$$;

create or replace function private.can_read_lesson_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.learning_lessons ll
    where ll.asset_path = object_name
      and ll.is_published = true
      and (
        ll.access_level = 'free'
        or private.has_active_premium(auth.uid())
        or private.is_admin()
      )
  );
$$;

create or replace function private.sync_player_public_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.player_profiles
  set
    display_name = coalesce(new.full_name, concat_ws(' ', new.first_name, new.last_name)),
    avatar_path = new.avatar_path,
    country = coalesce(new.country, country),
    city = coalesce(new.city, city),
    is_legionnaire = coalesce(new.is_diaspora, is_legionnaire)
  where user_id = new.id;

  return new;
end;
$$;

create or replace function private.refresh_reward_claim_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reward uuid;
begin
  target_reward := coalesce(new.reward_id, old.reward_id);

  update public.sponsor_rewards sr
  set
    quantity_claimed = (
      select count(*)
      from public.reward_claims rc
      where rc.reward_id = target_reward
        and rc.status in ('approved', 'fulfilled')
    ),
    updated_at = timezone('utc', now())
  where sr.id = target_reward;

  return coalesce(new, old);
end;
$$;

create or replace function private.bootstrap_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  user_row auth.users%rowtype;
  user_meta jsonb;
  profile_meta jsonb;
  role_value public.user_role;
  resolved_full_name text;
begin
  select *
  into user_row
  from auth.users
  where id = target_user_id;

  if not found then
    return;
  end if;

  user_meta := coalesce(user_row.raw_user_meta_data, '{}'::jsonb);
  profile_meta := coalesce(user_meta -> 'profile', '{}'::jsonb);
  resolved_full_name := nullif(coalesce(user_meta ->> 'full_name', concat_ws(' ', user_meta ->> 'first_name', user_meta ->> 'last_name')), '');

  role_value := case lower(coalesce(user_meta ->> 'role', 'player'))
    when 'parent' then 'parent'::public.user_role
    when 'agent' then 'agent'::public.user_role
    when 'scout' then 'scout'::public.user_role
    when 'academy' then 'academy'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'player'::public.user_role
  end;

  insert into public.profiles (id, email, role, first_name, last_name, full_name)
  values (
    user_row.id,
    user_row.email,
    role_value,
    nullif(user_meta ->> 'first_name', ''),
    nullif(user_meta ->> 'last_name', ''),
    resolved_full_name
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = excluded.role,
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = timezone('utc', now());

  if role_value = 'player' then
    insert into public.player_profiles (
      user_id, display_name, avatar_path, age, primary_position, position_label,
      preferred_foot, current_club_name, country, current_country, is_legionnaire, visibility_public
    )
    values (
      user_row.id,
      resolved_full_name,
      nullif(user_meta ->> 'avatar_path', ''),
      nullif(profile_meta ->> 'playerAge', '')::integer,
      private.normalize_position(profile_meta ->> 'playerPosition'),
      nullif(profile_meta ->> 'playerPosition', ''),
      private.normalize_foot(profile_meta ->> 'playerFoot'),
      nullif(profile_meta ->> 'playerTeam', ''),
      'Georgia',
      null,
      false,
      true
    )
    on conflict (user_id) do update
    set
      display_name = coalesce(excluded.display_name, public.player_profiles.display_name),
      age = coalesce(excluded.age, public.player_profiles.age),
      primary_position = coalesce(excluded.primary_position, public.player_profiles.primary_position),
      position_label = coalesce(excluded.position_label, public.player_profiles.position_label),
      preferred_foot = coalesce(excluded.preferred_foot, public.player_profiles.preferred_foot),
      current_club_name = coalesce(excluded.current_club_name, public.player_profiles.current_club_name),
      updated_at = timezone('utc', now());
  elsif role_value = 'parent' then
    insert into public.parent_profiles (
      user_id, relation_to_child, child_full_name, child_age, child_position, child_position_label
    )
    values (
      user_row.id,
      nullif(profile_meta ->> 'parentRelation', ''),
      nullif(profile_meta ->> 'childName', ''),
      nullif(profile_meta ->> 'childAge', '')::integer,
      private.normalize_position(profile_meta ->> 'childPosition'),
      nullif(profile_meta ->> 'childPosition', '')
    )
    on conflict (user_id) do update
    set
      relation_to_child = coalesce(excluded.relation_to_child, public.parent_profiles.relation_to_child),
      child_full_name = coalesce(excluded.child_full_name, public.parent_profiles.child_full_name),
      child_age = coalesce(excluded.child_age, public.parent_profiles.child_age),
      child_position = coalesce(excluded.child_position, public.parent_profiles.child_position),
      child_position_label = coalesce(excluded.child_position_label, public.parent_profiles.child_position_label),
      updated_at = timezone('utc', now());
  elsif role_value = 'agent' then
    insert into public.agent_profiles (
      user_id, agency_name, players_managed_count, region, focus_area
    )
    values (
      user_row.id,
      nullif(profile_meta ->> 'agencyName', ''),
      nullif(profile_meta ->> 'playersManaged', '')::integer,
      nullif(profile_meta ->> 'agencyRegion', ''),
      nullif(profile_meta ->> 'agentFocus', '')
    )
    on conflict (user_id) do update
    set
      agency_name = coalesce(excluded.agency_name, public.agent_profiles.agency_name),
      players_managed_count = coalesce(excluded.players_managed_count, public.agent_profiles.players_managed_count),
      region = coalesce(excluded.region, public.agent_profiles.region),
      focus_area = coalesce(excluded.focus_area, public.agent_profiles.focus_area),
      updated_at = timezone('utc', now());
  end if;

  insert into public.user_subscriptions (user_id, plan_code, status, starts_at, auto_renew)
  select
    user_row.id,
    'free'::public.subscription_plan_code,
    'active',
    timezone('utc', now()),
    false
  where not exists (
    select 1
    from public.user_subscriptions us
    where us.user_id = user_row.id
      and us.status in ('trialing', 'active')
  );
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform private.bootstrap_user(new.id);
  return new;
end;
$$;

create or replace function private.backfill_auth_users()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_user record;
begin
  for auth_user in select id from auth.users loop
    perform private.bootstrap_user(auth_user.id);
  end loop;
end;
$$;

drop trigger if exists trg_sync_player_public_fields on public.profiles;
create trigger trg_sync_player_public_fields
after update of full_name, avatar_path, country, city, is_diaspora on public.profiles
for each row execute function private.sync_player_public_fields();

drop trigger if exists trg_refresh_reward_claim_total on public.reward_claims;
create trigger trg_refresh_reward_claim_total
after insert or update or delete on public.reward_claims
for each row execute function private.refresh_reward_claim_total();

insert into public.subscription_plans (
  code, name, price_monthly_gel, video_limit, analytics_enabled, learning_access, priority_support
)
values
  ('free', 'Free', 0, 3, false, false, false),
  ('premium', 'Premium', 29, null, true, true, true)
on conflict (code) do update
set
  name = excluded.name,
  price_monthly_gel = excluded.price_monthly_gel,
  video_limit = excluded.video_limit,
  analytics_enabled = excluded.analytics_enabled,
  learning_access = excluded.learning_access,
  priority_support = excluded.priority_support;

insert into public.learning_categories (slug, title, description, sort_order)
values
  ('technique', 'Technique', 'Ball mastery, dribbling, first touch and finishing.', 1),
  ('tactics', 'Tactics', 'Positioning, decision making, pressing and game reading.', 2),
  ('nutrition', 'Nutrition', 'Match-day fuel, hydration and recovery nutrition.', 3),
  ('physical', 'Physical Prep', 'Speed, agility, strength and injury prevention.', 4)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.badges (code, title, description, icon_name)
values
  ('top-scorer', 'Top Scorer', 'Awarded to the leading goal scorer in a leaderboard cycle.', 'trophy'),
  ('playmaker', 'Playmaker', 'Awarded to players with standout assist and creativity numbers.', 'sparkles'),
  ('best-save', 'Best Save', 'Monthly fan-voted goalkeeper save winner.', 'shield'),
  ('rising-star', 'Rising Star', 'Awarded to standout young talents with strong momentum.', 'star'),
  ('consistency', 'Consistency', 'Awarded for sustained high-level performances.', 'award')
on conflict (code) do update
set
  title = excluded.title,
  description = excluded.description,
  icon_name = excluded.icon_name;

insert into public.sponsor_rewards (
  title, sponsor_name, description, reward_type, quantity_total, is_active
)
values
  ('Elite Boots Pack', 'Test Sponsor', 'Monthly winner receives premium football boots.', 'equipment', 3, true),
  ('Training Kit Bundle', 'Test Sponsor', 'Top voted player gets full training apparel kit.', 'equipment', 5, true)
on conflict do nothing;

insert into public.clubs (
  slug, short_code, name, city, country, age_band, coach_name, players_count, is_public, is_active
)
values
  ('dinamo-tbilisi', 'DT', 'Dinamo Tbilisi', 'Tbilisi', 'Georgia', 'PRO', 'G. Abramidze', 24, true, true),
  ('torpedo-kutaisi', 'TQ', 'Torpedo Kutaisi', 'Kutaisi', 'Georgia', 'PRO', 'L. Kalandadze', 23, true, true),
  ('saburtalo-tbilisi', 'SB', 'Saburtalo Tbilisi', 'Tbilisi', 'Georgia', 'U19', 'N. Javakhishvili', 26, true, true),
  ('dinamo-batumi', 'DB', 'Dinamo Batumi', 'Batumi', 'Georgia', 'PRO', 'R. Shanidze', 25, true, true),
  ('dila-gori', 'DG', 'Dila Gori', 'Gori', 'Georgia', 'U21', 'T. Nozadze', 21, true, true),
  ('kolkheti-poti', 'KF', 'Kolkheti Poti', 'Poti', 'Georgia', 'U17', 'B. Karchava', 20, true, true),
  ('samgurali-tskaltubo', 'SZ', 'Samgurali Tskaltubo', 'Tskaltubo', 'Georgia', 'PRO', 'S. Fagava', 24, true, true),
  ('gagra-tbilisi', 'GG', 'Gagra Tbilisi', 'Tbilisi', 'Georgia', 'U19', 'O. Chelidze', 22, true, true),
  ('telavi', 'TL', 'Telavi', 'Telavi', 'Georgia', 'PRO', 'G. Diasamidze', 23, true, true),
  ('samtredia', 'SM', 'Samtredia', 'Samtredia', 'Georgia', 'U21', 'I. Melkadze', 21, true, true),
  ('shukura-kobuleti', 'SQ', 'Shukura Kobuleti', 'Kobuleti', 'Georgia', 'U19', 'L. Dumbadze', 22, true, true),
  ('merani-martvili', 'MM', 'Merani Martvili', 'Martvili', 'Georgia', 'U17', 'A. Chanturia', 19, true, true),
  ('wit-georgia', 'VJ', 'WIT Georgia', 'Tbilisi', 'Georgia', 'U21', 'Sh. Merabishvili', 23, true, true),
  ('lokomotivi-tbilisi', 'LT', 'Lokomotivi Tbilisi', 'Tbilisi', 'Georgia', 'U19', 'D. Gabitashvili', 24, true, true),
  ('rustavi', 'RS', 'Rustavi', 'Rustavi', 'Georgia', 'PRO', 'V. Maisuradze', 24, true, true),
  ('chikhura-sachkhere', 'CS', 'Chikhura Sachkhere', 'Sachkhere', 'Georgia', 'U21', 'R. Kiknadze', 20, true, true),
  ('spaeri', 'SP', 'Spaeri', 'Tbilisi', 'Georgia', 'PRO', 'D. Chkhetiani', 22, true, true),
  ('iberia-1999', 'IB', 'Iberia 1999', 'Tbilisi', 'Georgia', 'U19', 'G. Zakareishvili', 25, true, true),
  ('gareji-sagarejo', 'GR', 'Gareji Sagarejo', 'Sagarejo', 'Georgia', 'U17', 'M. Khutsishvili', 18, true, true),
  ('sioni-bolnisi', 'SN', 'Sioni Bolnisi', 'Bolnisi', 'Georgia', 'PRO', 'Z. Mumladze', 24, true, true)
on conflict (slug) do update
set
  short_code = excluded.short_code,
  name = excluded.name,
  city = excluded.city,
  country = excluded.country,
  age_band = excluded.age_band,
  coach_name = excluded.coach_name,
  players_count = excluded.players_count,
  is_public = excluded.is_public,
  is_active = excluded.is_active;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

select private.backfill_auth_users();

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.player_profiles enable row level security;
alter table public.parent_profiles enable row level security;
alter table public.agent_profiles enable row level security;
alter table public.player_parent_links enable row level security;
alter table public.agent_player_links enable row level security;
alter table public.player_season_stats enable row level security;
alter table public.player_physical_tests enable row level security;
alter table public.video_highlights enable row level security;
alter table public.learning_categories enable row level security;
alter table public.learning_lessons enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.leaderboard_snapshots enable row level security;
alter table public.voting_campaigns enable row level security;
alter table public.vote_nominees enable row level security;
alter table public.votes enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.sponsor_rewards enable row level security;
alter table public.reward_claims enable row level security;
alter table public.scout_notes enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
on public.profiles
for select
to authenticated
using (id = auth.uid() or private.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid() or private.is_admin())
with check (id = auth.uid() or private.is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
on public.profiles
for delete
to authenticated
using (private.is_admin());

drop policy if exists clubs_public_read on public.clubs;
create policy clubs_public_read
on public.clubs
for select
to public
using (is_public = true and is_active = true);

drop policy if exists clubs_admin_write on public.clubs;
create policy clubs_admin_write
on public.clubs
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists player_profiles_public_read on public.player_profiles;
create policy player_profiles_public_read
on public.player_profiles
for select
to public
using (visibility_public = true);

drop policy if exists player_profiles_auth_read on public.player_profiles;
create policy player_profiles_auth_read
on public.player_profiles
for select
to authenticated
using (private.can_view_player(user_id));

drop policy if exists player_profiles_insert_self on public.player_profiles;
create policy player_profiles_insert_self
on public.player_profiles
for insert
to authenticated
with check (user_id = auth.uid() or private.is_admin());

drop policy if exists player_profiles_update_manage on public.player_profiles;
create policy player_profiles_update_manage
on public.player_profiles
for update
to authenticated
using (private.can_manage_player(user_id) or private.is_admin())
with check (private.can_manage_player(user_id) or private.is_admin());

drop policy if exists player_profiles_delete_admin on public.player_profiles;
create policy player_profiles_delete_admin
on public.player_profiles
for delete
to authenticated
using (private.is_admin());

drop policy if exists parent_profiles_read_self on public.parent_profiles;
create policy parent_profiles_read_self
on public.parent_profiles
for select
to authenticated
using (user_id = auth.uid() or private.is_admin());

drop policy if exists parent_profiles_write_self on public.parent_profiles;
create policy parent_profiles_write_self
on public.parent_profiles
for all
to authenticated
using (user_id = auth.uid() or private.is_admin())
with check (user_id = auth.uid() or private.is_admin());

drop policy if exists agent_profiles_read_self on public.agent_profiles;
create policy agent_profiles_read_self
on public.agent_profiles
for select
to authenticated
using (user_id = auth.uid() or private.is_admin());

drop policy if exists agent_profiles_write_self on public.agent_profiles;
create policy agent_profiles_write_self
on public.agent_profiles
for all
to authenticated
using (user_id = auth.uid() or private.is_admin())
with check (user_id = auth.uid() or private.is_admin());

drop policy if exists player_parent_links_read on public.player_parent_links;
create policy player_parent_links_read
on public.player_parent_links
for select
to authenticated
using (player_id = auth.uid() or parent_user_id = auth.uid() or private.is_admin());

drop policy if exists player_parent_links_write on public.player_parent_links;
create policy player_parent_links_write
on public.player_parent_links
for all
to authenticated
using (player_id = auth.uid() or parent_user_id = auth.uid() or private.is_admin())
with check (player_id = auth.uid() or parent_user_id = auth.uid() or private.is_admin());

drop policy if exists agent_player_links_read on public.agent_player_links;
create policy agent_player_links_read
on public.agent_player_links
for select
to authenticated
using (player_id = auth.uid() or agent_user_id = auth.uid() or private.is_admin());

drop policy if exists agent_player_links_write on public.agent_player_links;
create policy agent_player_links_write
on public.agent_player_links
for all
to authenticated
using (player_id = auth.uid() or agent_user_id = auth.uid() or private.is_admin())
with check (player_id = auth.uid() or agent_user_id = auth.uid() or private.is_admin());

drop policy if exists player_stats_public_read on public.player_season_stats;
create policy player_stats_public_read
on public.player_season_stats
for select
to public
using (
  exists (
    select 1 from public.player_profiles pp
    where pp.user_id = player_id and pp.visibility_public = true
  )
);

drop policy if exists player_stats_auth_read on public.player_season_stats;
create policy player_stats_auth_read
on public.player_season_stats
for select
to authenticated
using (private.can_view_player(player_id));

drop policy if exists player_stats_write_manage on public.player_season_stats;
create policy player_stats_write_manage
on public.player_season_stats
for all
to authenticated
using (private.can_manage_player(player_id) or private.is_admin())
with check (private.can_manage_player(player_id) or private.is_admin());

drop policy if exists player_tests_read_auth on public.player_physical_tests;
create policy player_tests_read_auth
on public.player_physical_tests
for select
to authenticated
using (private.can_view_player(player_id));

drop policy if exists player_tests_write_manage on public.player_physical_tests;
create policy player_tests_write_manage
on public.player_physical_tests
for all
to authenticated
using (private.can_manage_player(player_id) or private.is_admin())
with check (private.can_manage_player(player_id) or private.is_admin());

drop policy if exists highlights_public_read on public.video_highlights;
create policy highlights_public_read
on public.video_highlights
for select
to public
using (visibility = 'public');

drop policy if exists highlights_auth_read on public.video_highlights;
create policy highlights_auth_read
on public.video_highlights
for select
to authenticated
using (
  owner_user_id = auth.uid()
  or private.can_manage_player(player_id)
  or visibility = 'public'
  or (
    visibility = 'scout_only'
    and coalesce(private.current_user_role(), 'player'::public.user_role) = any (
      array['scout'::public.user_role, 'academy'::public.user_role, 'admin'::public.user_role]
    )
  )
);

drop policy if exists highlights_insert_owner on public.video_highlights;
create policy highlights_insert_owner
on public.video_highlights
for insert
to authenticated
with check (owner_user_id = auth.uid() and private.can_create_highlight(player_id));

drop policy if exists highlights_update_manage on public.video_highlights;
create policy highlights_update_manage
on public.video_highlights
for update
to authenticated
using (owner_user_id = auth.uid() or private.can_manage_player(player_id) or private.is_admin())
with check (owner_user_id = auth.uid() or private.can_manage_player(player_id) or private.is_admin());

drop policy if exists highlights_delete_manage on public.video_highlights;
create policy highlights_delete_manage
on public.video_highlights
for delete
to authenticated
using (owner_user_id = auth.uid() or private.can_manage_player(player_id) or private.is_admin());

drop policy if exists learning_categories_public_read on public.learning_categories;
create policy learning_categories_public_read
on public.learning_categories
for select
to public
using (true);

drop policy if exists learning_categories_admin_write on public.learning_categories;
create policy learning_categories_admin_write
on public.learning_categories
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists learning_lessons_public_free on public.learning_lessons;
create policy learning_lessons_public_free
on public.learning_lessons
for select
to public
using (is_published = true and access_level = 'free');

drop policy if exists learning_lessons_auth_read on public.learning_lessons;
create policy learning_lessons_auth_read
on public.learning_lessons
for select
to authenticated
using (
  is_published = true
  and (
    access_level = 'free'
    or private.has_active_premium(auth.uid())
    or private.is_admin()
  )
);

drop policy if exists learning_lessons_admin_write on public.learning_lessons;
create policy learning_lessons_admin_write
on public.learning_lessons
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists subscription_plans_public_read on public.subscription_plans;
create policy subscription_plans_public_read
on public.subscription_plans
for select
to public
using (true);

drop policy if exists user_subscriptions_read_self on public.user_subscriptions;
create policy user_subscriptions_read_self
on public.user_subscriptions
for select
to authenticated
using (user_id = auth.uid() or private.is_admin());

drop policy if exists user_subscriptions_admin_write on public.user_subscriptions;
create policy user_subscriptions_admin_write
on public.user_subscriptions
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists leaderboards_public_read on public.leaderboard_snapshots;
create policy leaderboards_public_read
on public.leaderboard_snapshots
for select
to public
using (true);

drop policy if exists leaderboards_admin_write on public.leaderboard_snapshots;
create policy leaderboards_admin_write
on public.leaderboard_snapshots
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists voting_campaigns_public_read on public.voting_campaigns;
create policy voting_campaigns_public_read
on public.voting_campaigns
for select
to public
using (status <> 'draft');

drop policy if exists voting_campaigns_admin_write on public.voting_campaigns;
create policy voting_campaigns_admin_write
on public.voting_campaigns
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists vote_nominees_public_read on public.vote_nominees;
create policy vote_nominees_public_read
on public.vote_nominees
for select
to public
using (
  exists (
    select 1 from public.voting_campaigns vc
    where vc.id = campaign_id and vc.status <> 'draft'
  )
);

drop policy if exists vote_nominees_admin_write on public.vote_nominees;
create policy vote_nominees_admin_write
on public.vote_nominees
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists votes_read_self on public.votes;
create policy votes_read_self
on public.votes
for select
to authenticated
using (voter_user_id = auth.uid() or private.is_admin());

drop policy if exists votes_insert_self on public.votes;
create policy votes_insert_self
on public.votes
for insert
to authenticated
with check (
  voter_user_id = auth.uid()
  and exists (
    select 1
    from public.voting_campaigns vc
    join public.vote_nominees vn on vn.campaign_id = vc.id
    where vc.id = campaign_id
      and vn.id = nominee_id
      and vc.status = 'live'
      and timezone('utc', now()) between vc.starts_at and vc.ends_at
  )
);

drop policy if exists badges_public_read on public.badges;
create policy badges_public_read
on public.badges
for select
to public
using (true);

drop policy if exists badges_admin_write on public.badges;
create policy badges_admin_write
on public.badges
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists user_badges_public_read on public.user_badges;
create policy user_badges_public_read
on public.user_badges
for select
to public
using (
  exists (
    select 1 from public.player_profiles pp
    where pp.user_id = user_id and pp.visibility_public = true
  )
);

drop policy if exists user_badges_auth_read on public.user_badges;
create policy user_badges_auth_read
on public.user_badges
for select
to authenticated
using (user_id = auth.uid() or private.is_admin());

drop policy if exists user_badges_admin_write on public.user_badges;
create policy user_badges_admin_write
on public.user_badges
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists sponsor_rewards_public_read on public.sponsor_rewards;
create policy sponsor_rewards_public_read
on public.sponsor_rewards
for select
to public
using (is_active = true);

drop policy if exists sponsor_rewards_admin_write on public.sponsor_rewards;
create policy sponsor_rewards_admin_write
on public.sponsor_rewards
for all
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists reward_claims_read_self on public.reward_claims;
create policy reward_claims_read_self
on public.reward_claims
for select
to authenticated
using (user_id = auth.uid() or private.is_admin());

drop policy if exists reward_claims_insert_self on public.reward_claims;
create policy reward_claims_insert_self
on public.reward_claims
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.sponsor_rewards sr
    where sr.id = reward_id and sr.is_active = true
  )
);

drop policy if exists reward_claims_admin_update on public.reward_claims;
create policy reward_claims_admin_update
on public.reward_claims
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists scout_notes_read on public.scout_notes;
create policy scout_notes_read
on public.scout_notes
for select
to authenticated
using (
  scout_user_id = auth.uid()
  or private.is_admin()
  or (
    is_shared_with_player = true
    and (player_id = auth.uid() or private.is_parent_of_player(player_id))
  )
);

drop policy if exists scout_notes_insert on public.scout_notes;
create policy scout_notes_insert
on public.scout_notes
for insert
to authenticated
with check (
  scout_user_id = auth.uid()
  and coalesce(private.current_user_role(), 'player'::public.user_role) = any (
    array['scout'::public.user_role, 'academy'::public.user_role, 'admin'::public.user_role]
  )
);

drop policy if exists scout_notes_update on public.scout_notes;
create policy scout_notes_update
on public.scout_notes
for update
to authenticated
using (scout_user_id = auth.uid() or private.is_admin())
with check (scout_user_id = auth.uid() or private.is_admin());

drop policy if exists scout_notes_delete on public.scout_notes;
create policy scout_notes_delete
on public.scout_notes
for delete
to authenticated
using (scout_user_id = auth.uid() or private.is_admin());

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;

grant execute on function private.current_user_role() to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_parent_of_player(uuid) to anon, authenticated;
grant execute on function private.is_agent_for_player(uuid) to anon, authenticated;
grant execute on function private.can_manage_player(uuid) to anon, authenticated;
grant execute on function private.can_view_player(uuid) to anon, authenticated;
grant execute on function private.has_active_premium(uuid) to anon, authenticated;
grant execute on function private.player_has_premium_access(uuid) to anon, authenticated;
grant execute on function private.can_create_highlight(uuid) to anon, authenticated;
grant execute on function private.can_read_highlight_object(text) to anon, authenticated;
grant execute on function private.can_read_lesson_object(text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('club-assets', 'club-assets', true),
  ('highlight-media', 'highlight-media', false),
  ('lesson-assets', 'lesson-assets', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and ((storage.foldername(name))[1] = (select auth.jwt() ->> 'sub') or private.is_admin())
);

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and ((storage.foldername(name))[1] = (select auth.jwt() ->> 'sub') or private.is_admin())
)
with check (
  bucket_id = 'avatars'
  and ((storage.foldername(name))[1] = (select auth.jwt() ->> 'sub') or private.is_admin())
);

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and ((storage.foldername(name))[1] = (select auth.jwt() ->> 'sub') or private.is_admin())
);

drop policy if exists club_assets_public_read on storage.objects;
create policy club_assets_public_read
on storage.objects
for select
to public
using (bucket_id = 'club-assets');

drop policy if exists club_assets_admin_write on storage.objects;
create policy club_assets_admin_write
on storage.objects
for all
to authenticated
using (bucket_id = 'club-assets' and private.is_admin())
with check (bucket_id = 'club-assets' and private.is_admin());

drop policy if exists highlight_media_read on storage.objects;
create policy highlight_media_read
on storage.objects
for select
to public
using (bucket_id = 'highlight-media' and private.can_read_highlight_object(name));

drop policy if exists highlight_media_insert on storage.objects;
create policy highlight_media_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'highlight-media'
  and ((storage.foldername(name))[1] = (select auth.jwt() ->> 'sub') or private.is_admin())
);

drop policy if exists highlight_media_update on storage.objects;
create policy highlight_media_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'highlight-media'
  and ((storage.foldername(name))[1] = (select auth.jwt() ->> 'sub') or private.is_admin())
)
with check (
  bucket_id = 'highlight-media'
  and ((storage.foldername(name))[1] = (select auth.jwt() ->> 'sub') or private.is_admin())
);

drop policy if exists highlight_media_delete on storage.objects;
create policy highlight_media_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'highlight-media'
  and ((storage.foldername(name))[1] = (select auth.jwt() ->> 'sub') or private.is_admin())
);

drop policy if exists lesson_assets_read on storage.objects;
create policy lesson_assets_read
on storage.objects
for select
to public
using (bucket_id = 'lesson-assets' and private.can_read_lesson_object(name));

drop policy if exists lesson_assets_admin_write on storage.objects;
create policy lesson_assets_admin_write
on storage.objects
for all
to authenticated
using (bucket_id = 'lesson-assets' and private.is_admin())
with check (bucket_id = 'lesson-assets' and private.is_admin());

commit;

-- After running this file, manually promote your own account to admin once:
-- update public.profiles
-- set role = 'admin'
-- where email = 'your-email@example.com';
