-- Incremental refactor for the current Supabase project.
-- Run this AFTER `supabase_full_setup.sql`.

alter table public.profiles
  add column if not exists personal_number text,
  add column if not exists accepted_terms_at timestamptz;

alter table public.player_profiles
  add column if not exists birth_date date,
  add column if not exists season_year integer,
  add column if not exists age_group_auto text,
  add column if not exists age_group_manual text,
  add column if not exists club_slug text,
  add column if not exists club_route text,
  add column if not exists club_status text,
  add column if not exists source_role public.user_role not null default 'player';

alter table public.parent_profiles
  add column if not exists child_birth_date date,
  add column if not exists child_preferred_foot public.preferred_foot not null default 'unknown',
  add column if not exists child_club_name text,
  add column if not exists child_club_slug text,
  add column if not exists child_club_route text,
  add column if not exists child_club_status text,
  add column if not exists child_age_group text,
  add column if not exists child_age_group_auto text,
  add column if not exists child_age_group_override text,
  add column if not exists child_avatar_path text;

create or replace function private.parse_birth_date_flexible(raw_value text)
returns date
language plpgsql
immutable
as $$
declare
  cleaned text := nullif(btrim(raw_value), '');
  parts text[];
begin
  if cleaned is null then
    return null;
  end if;

  if cleaned ~ '^\d{4}-\d{2}-\d{2}$' then
    return cleaned::date;
  end if;

  if cleaned ~ '^\d{2}\.\d{2}\.\d{4}$' then
    parts := regexp_split_to_array(cleaned, '\.');
    return make_date(parts[3]::integer, parts[2]::integer, parts[1]::integer);
  end if;

  return null;
exception
  when others then
    return null;
end;
$$;

create or replace function private.current_season_year()
returns integer
language sql
stable
as $$
  select extract(year from timezone('utc', now()))::integer;
$$;

create or replace function private.normalize_age_group_key(raw_value text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(raw_value, ''))
    when 'pro' then 'pro'
    when 'u19' then 'u19'
    when 'u17' then 'u17'
    when 'u16' then 'u16'
    when 'u15' then 'u15'
    when 'u14' then 'u14'
    when 'u13' then 'u13'
    when 'u12' then 'u12'
    when 'u11' then 'u11'
    when 'u10' then 'u10'
    when 'u9' then 'u9'
    when 'u8' then 'u8'
    else null
  end;
$$;

create or replace function private.calculate_actual_age(birth_date date, reference_date date default timezone('utc', now())::date)
returns integer
language sql
stable
as $$
  select case
    when birth_date is null then null
    else extract(year from age(reference_date, birth_date))::integer
  end;
$$;

create or replace function private.calculate_season_age(birth_date date, season_year integer default private.current_season_year())
returns integer
language sql
stable
as $$
  select case
    when birth_date is null then null
    else (
      season_year
      - extract(year from birth_date)::integer
      - case when to_char(birth_date, 'MMDD') > '0101' then 1 else 0 end
    )
  end;
$$;

create or replace function private.age_group_key_from_age(age_value integer)
returns text
language sql
immutable
as $$
  select case
    when age_value is null then 'pro'
    when age_value <= 8 then 'u8'
    when age_value = 9 then 'u9'
    when age_value = 10 then 'u10'
    when age_value = 11 then 'u11'
    when age_value = 12 then 'u12'
    when age_value = 13 then 'u13'
    when age_value = 14 then 'u14'
    when age_value = 15 then 'u15'
    when age_value = 16 then 'u16'
    when age_value = 17 then 'u17'
    when age_value <= 19 then 'u19'
    else 'pro'
  end;
$$;

create or replace function private.age_group_key_from_birth_date(birth_date date, season_year integer default private.current_season_year())
returns text
language sql
stable
as $$
  select private.age_group_key_from_age(private.calculate_season_age(birth_date, season_year));
$$;

create or replace function private.club_route_from_slug(raw_slug text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(raw_slug, ''))
    when 'dinamo-tbilisi' then 'team-dinamo-tbilisi.html'
    else ''
  end;
$$;

create table if not exists public.player_registry (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  auth_user_id uuid unique references public.profiles (id) on delete set null,
  owner_user_id uuid references public.profiles (id) on delete cascade,
  owner_role public.user_role not null default 'player',
  full_name text not null,
  first_name text,
  last_name text,
  avatar_path text,
  birth_date date,
  birth_year integer,
  current_age integer,
  season_year integer not null default private.current_season_year(),
  age_group text not null default 'pro',
  age_group_auto text not null default 'pro',
  age_group_override text,
  primary_position public.player_position,
  position_label text,
  preferred_foot public.preferred_foot not null default 'unknown',
  club_id uuid references public.clubs (id) on delete set null,
  club_name text,
  club_slug text,
  club_route text,
  club_status text,
  visibility_public boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint player_registry_age_group_check check (age_group in ('pro', 'u19', 'u17', 'u16', 'u15', 'u14', 'u13', 'u12', 'u11', 'u10', 'u9', 'u8')),
  constraint player_registry_age_group_auto_check check (age_group_auto in ('pro', 'u19', 'u17', 'u16', 'u15', 'u14', 'u13', 'u12', 'u11', 'u10', 'u9', 'u8')),
  constraint player_registry_age_group_override_check check (age_group_override is null or age_group_override in ('pro', 'u19', 'u17', 'u16', 'u15', 'u14', 'u13', 'u12', 'u11', 'u10', 'u9', 'u8'))
);

create index if not exists idx_player_registry_owner on public.player_registry (owner_user_id, owner_role);
create index if not exists idx_player_registry_public on public.player_registry (visibility_public, is_active, age_group);
create index if not exists idx_player_registry_club on public.player_registry (club_slug, club_name);

drop trigger if exists trg_player_registry_updated_at on public.player_registry;
create trigger trg_player_registry_updated_at
before update on public.player_registry
for each row execute function public.set_updated_at();

create table if not exists public.player_vote_totals (
  player_id uuid primary key references public.player_registry (id) on delete cascade,
  votes_count integer not null default 0 check (votes_count >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_player_vote_totals_updated_at on public.player_vote_totals;
create trigger trg_player_vote_totals_updated_at
before update on public.player_vote_totals
for each row execute function public.set_updated_at();

create table if not exists public.player_votes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_registry (id) on delete cascade,
  voter_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (player_id, voter_user_id)
);

create index if not exists idx_player_votes_player on public.player_votes (player_id, created_at desc);
create index if not exists idx_player_votes_voter on public.player_votes (voter_user_id, created_at desc);

create or replace function private.refresh_single_player_vote_total(target_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_player_id is null then
    return;
  end if;

  insert into public.player_vote_totals (player_id, votes_count)
  values (
    target_player_id,
    (
      select count(*)
      from public.player_votes
      where player_id = target_player_id
    )
  )
  on conflict (player_id) do update
  set
    votes_count = excluded.votes_count,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function private.refresh_player_vote_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform private.refresh_single_player_vote_total(new.player_id);
  end if;

  if tg_op in ('DELETE', 'UPDATE') then
    perform private.refresh_single_player_vote_total(old.player_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_player_votes_refresh_totals on public.player_votes;
create trigger trg_player_votes_refresh_totals
after insert or update or delete on public.player_votes
for each row execute function private.refresh_player_vote_totals();

create or replace function private.sync_extended_profile_fields(target_user_id uuid)
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
  player_birth_date date;
  player_season_year integer := private.current_season_year();
  player_age integer;
  player_age_auto text;
  player_age_override text;
  player_age_effective text;
  player_team_name text;
  player_team_slug text;
  player_team_route text;
  player_team_status text;
  player_club_id uuid;
  player_photo text;
  next_child_birth_date date;
  next_child_age integer;
  child_age_auto text;
  child_age_override text;
  child_age_effective text;
  child_team_name text;
  child_team_slug text;
  child_team_route text;
  child_team_status text;
  child_photo text;
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

  role_value := case lower(coalesce(user_meta ->> 'role', 'player'))
    when 'parent' then 'parent'::public.user_role
    when 'agent' then 'agent'::public.user_role
    when 'scout' then 'scout'::public.user_role
    when 'academy' then 'academy'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'player'::public.user_role
  end;

  update public.profiles
  set
    phone = coalesce(nullif(user_meta ->> 'phone_number', ''), phone),
    personal_number = coalesce(nullif(user_meta ->> 'personal_number', ''), personal_number),
    avatar_path = coalesce(
      nullif(profile_meta ->> 'profilePhoto', ''),
      nullif(user_meta ->> 'avatar_path', ''),
      avatar_path
    ),
    accepted_terms_at = coalesce(
      nullif(user_meta ->> 'accepted_terms_at', '')::timestamptz,
      accepted_terms_at
    ),
    updated_at = timezone('utc', now())
  where id = target_user_id;

  if role_value = 'player' then
    player_birth_date := private.parse_birth_date_flexible(profile_meta ->> 'playerBirthDate');
    player_age := coalesce(
      nullif(profile_meta ->> 'playerAge', '')::integer,
      private.calculate_actual_age(player_birth_date)
    );
    player_age_override := private.normalize_age_group_key(profile_meta ->> 'playerAgeCategoryOverride');
    player_age_auto := coalesce(
      private.normalize_age_group_key(profile_meta ->> 'playerAgeCategoryAuto'),
      private.normalize_age_group_key(profile_meta ->> 'playerAgeCategory'),
      private.age_group_key_from_birth_date(player_birth_date, player_season_year),
      'pro'
    );
    player_age_effective := coalesce(player_age_override, player_age_auto, 'pro');
    player_team_name := nullif(profile_meta ->> 'playerTeam', '');
    player_team_slug := coalesce(
      nullif(profile_meta ->> 'playerTeamSlug', ''),
      (
        select c.slug
        from public.clubs c
        where lower(c.name) = lower(player_team_name)
        limit 1
      )
    );
    player_team_route := coalesce(
      nullif(profile_meta ->> 'playerTeamRoute', ''),
      private.club_route_from_slug(player_team_slug)
    );
    player_team_status := nullif(profile_meta ->> 'playerTeamStatus', '');
    player_club_id := (
      select c.id
      from public.clubs c
      where c.slug = player_team_slug
      limit 1
    );
    player_photo := coalesce(
      nullif(profile_meta ->> 'playerPhoto', ''),
      nullif(profile_meta ->> 'profilePhoto', ''),
      nullif(user_meta ->> 'avatar_path', '')
    );

    update public.player_profiles
    set
      birth_date = coalesce(player_birth_date, birth_date),
      season_year = player_season_year,
      age = coalesce(player_age, age),
      age_group_auto = player_age_auto,
      age_group_manual = player_age_override,
      primary_position = coalesce(private.normalize_position(profile_meta ->> 'playerPosition'), primary_position),
      position_label = coalesce(nullif(profile_meta ->> 'playerPosition', ''), position_label),
      preferred_foot = coalesce(private.normalize_foot(profile_meta ->> 'playerFoot'), preferred_foot),
      current_club_id = case
        when player_team_name is null then current_club_id
        else player_club_id
      end,
      current_club_name = coalesce(player_team_name, current_club_name),
      club_slug = case
        when player_team_name is null then club_slug
        else player_team_slug
      end,
      club_route = case
        when player_team_name is null then club_route
        else player_team_route
      end,
      club_status = case
        when player_team_name is null then club_status
        else player_team_status
      end,
      avatar_path = coalesce(player_photo, avatar_path),
      source_role = 'player',
      updated_at = timezone('utc', now())
    where user_id = target_user_id;
  elsif role_value = 'parent' then
    next_child_birth_date := private.parse_birth_date_flexible(profile_meta ->> 'childBirthDate');
    next_child_age := coalesce(
      nullif(profile_meta ->> 'childAge', '')::integer,
      private.calculate_actual_age(next_child_birth_date)
    );
    child_age_override := private.normalize_age_group_key(profile_meta ->> 'childAgeCategoryOverride');
    child_age_auto := coalesce(
      private.normalize_age_group_key(profile_meta ->> 'childAgeCategoryAuto'),
      private.normalize_age_group_key(profile_meta ->> 'childAgeCategory'),
      private.age_group_key_from_birth_date(next_child_birth_date, player_season_year),
      'pro'
    );
    child_age_effective := coalesce(child_age_override, child_age_auto, 'pro');
    child_team_name := nullif(profile_meta ->> 'childTeam', '');
    child_team_slug := coalesce(
      nullif(profile_meta ->> 'childTeamSlug', ''),
      (
        select c.slug
        from public.clubs c
        where lower(c.name) = lower(child_team_name)
        limit 1
      )
    );
    child_team_route := coalesce(
      nullif(profile_meta ->> 'childTeamRoute', ''),
      private.club_route_from_slug(child_team_slug)
    );
    child_team_status := nullif(profile_meta ->> 'childTeamStatus', '');
    child_photo := coalesce(
      nullif(profile_meta ->> 'childPhoto', ''),
      nullif(profile_meta ->> 'profilePhoto', '')
    );

    update public.parent_profiles
    set
      relation_to_child = coalesce(nullif(profile_meta ->> 'parentRelation', ''), relation_to_child),
      child_full_name = coalesce(nullif(profile_meta ->> 'childName', ''), child_full_name),
      child_birth_date = coalesce(next_child_birth_date, parent_profiles.child_birth_date),
      child_age = coalesce(next_child_age, parent_profiles.child_age),
      child_position = coalesce(private.normalize_position(profile_meta ->> 'childPosition'), child_position),
      child_position_label = coalesce(nullif(profile_meta ->> 'childPosition', ''), child_position_label),
      child_preferred_foot = coalesce(private.normalize_foot(profile_meta ->> 'childFoot'), child_preferred_foot),
      child_club_name = coalesce(child_team_name, child_club_name),
      child_club_slug = case
        when child_team_name is null then child_club_slug
        else child_team_slug
      end,
      child_club_route = case
        when child_team_name is null then child_club_route
        else child_team_route
      end,
      child_club_status = case
        when child_team_name is null then child_club_status
        else child_team_status
      end,
      child_age_group = child_age_effective,
      child_age_group_auto = child_age_auto,
      child_age_group_override = child_age_override,
      child_avatar_path = coalesce(child_photo, child_avatar_path),
      contact_phone = coalesce(nullif(user_meta ->> 'phone_number', ''), contact_phone),
      updated_at = timezone('utc', now())
    where user_id = target_user_id;
  elsif role_value = 'agent' then
    update public.agent_profiles
    set
      agency_name = coalesce(nullif(profile_meta ->> 'agencyName', ''), agency_name),
      players_managed_count = coalesce(nullif(profile_meta ->> 'playersManaged', '')::integer, players_managed_count),
      region = coalesce(nullif(profile_meta ->> 'agencyRegion', ''), region),
      focus_area = coalesce(nullif(profile_meta ->> 'agentFocus', ''), focus_area),
      updated_at = timezone('utc', now())
    where user_id = target_user_id;
  end if;
end;
$$;

create or replace function private.sync_player_registry_entry(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_profile public.profiles%rowtype;
  player_profile public.player_profiles%rowtype;
  parent_profile public.parent_profiles%rowtype;
  auth_source_key text;
  parent_source_key text;
  registry_name text;
begin
  select *
  into base_profile
  from public.profiles
  where id = target_user_id;

  if not found then
    return;
  end if;

  auth_source_key := 'auth:' || target_user_id::text;
  parent_source_key := 'parent-child:' || target_user_id::text;

  if base_profile.role = 'player' then
    select *
    into player_profile
    from public.player_profiles
    where user_id = target_user_id;

    registry_name := coalesce(
      nullif(player_profile.display_name, ''),
      nullif(base_profile.full_name, ''),
      concat_ws(' ', base_profile.first_name, base_profile.last_name),
      base_profile.email
    );

    insert into public.player_registry (
      source_key,
      auth_user_id,
      owner_user_id,
      owner_role,
      full_name,
      first_name,
      last_name,
      avatar_path,
      birth_date,
      birth_year,
      current_age,
      season_year,
      age_group,
      age_group_auto,
      age_group_override,
      primary_position,
      position_label,
      preferred_foot,
      club_id,
      club_name,
      club_slug,
      club_route,
      club_status,
      visibility_public,
      is_active
    )
    values (
      auth_source_key,
      target_user_id,
      target_user_id,
      'player',
      registry_name,
      nullif(base_profile.first_name, ''),
      nullif(base_profile.last_name, ''),
      coalesce(nullif(player_profile.avatar_path, ''), base_profile.avatar_path),
      player_profile.birth_date,
      extract(year from player_profile.birth_date)::integer,
      coalesce(player_profile.age, private.calculate_actual_age(player_profile.birth_date)),
      coalesce(player_profile.season_year, private.current_season_year()),
      coalesce(
        private.normalize_age_group_key(player_profile.age_group_manual),
        private.normalize_age_group_key(player_profile.age_group_auto),
        private.age_group_key_from_birth_date(player_profile.birth_date, coalesce(player_profile.season_year, private.current_season_year())),
        'pro'
      ),
      coalesce(
        private.normalize_age_group_key(player_profile.age_group_auto),
        private.age_group_key_from_birth_date(player_profile.birth_date, coalesce(player_profile.season_year, private.current_season_year())),
        'pro'
      ),
      private.normalize_age_group_key(player_profile.age_group_manual),
      player_profile.primary_position,
      player_profile.position_label,
      coalesce(player_profile.preferred_foot, 'unknown'::public.preferred_foot),
      player_profile.current_club_id,
      player_profile.current_club_name,
      player_profile.club_slug,
      player_profile.club_route,
      player_profile.club_status,
      coalesce(player_profile.visibility_public, true),
      true
    )
    on conflict (source_key) do update
    set
      auth_user_id = excluded.auth_user_id,
      owner_user_id = excluded.owner_user_id,
      owner_role = excluded.owner_role,
      full_name = excluded.full_name,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      avatar_path = coalesce(excluded.avatar_path, public.player_registry.avatar_path),
      birth_date = coalesce(excluded.birth_date, public.player_registry.birth_date),
      birth_year = coalesce(excluded.birth_year, public.player_registry.birth_year),
      current_age = coalesce(excluded.current_age, public.player_registry.current_age),
      season_year = coalesce(excluded.season_year, public.player_registry.season_year),
      age_group = coalesce(excluded.age_group, public.player_registry.age_group),
      age_group_auto = coalesce(excluded.age_group_auto, public.player_registry.age_group_auto),
      age_group_override = excluded.age_group_override,
      primary_position = coalesce(excluded.primary_position, public.player_registry.primary_position),
      position_label = coalesce(excluded.position_label, public.player_registry.position_label),
      preferred_foot = coalesce(excluded.preferred_foot, public.player_registry.preferred_foot),
      club_id = coalesce(excluded.club_id, public.player_registry.club_id),
      club_name = coalesce(excluded.club_name, public.player_registry.club_name),
      club_slug = coalesce(excluded.club_slug, public.player_registry.club_slug),
      club_route = coalesce(excluded.club_route, public.player_registry.club_route),
      club_status = coalesce(excluded.club_status, public.player_registry.club_status),
      visibility_public = excluded.visibility_public,
      is_active = excluded.is_active,
      updated_at = timezone('utc', now());

    delete from public.player_registry
    where source_key = parent_source_key;
  elsif base_profile.role = 'parent' then
    select *
    into parent_profile
    from public.parent_profiles
    where user_id = target_user_id;

    if nullif(parent_profile.child_full_name, '') is null then
      delete from public.player_registry
      where source_key = parent_source_key;
      return;
    end if;

    insert into public.player_registry (
      source_key,
      auth_user_id,
      owner_user_id,
      owner_role,
      full_name,
      avatar_path,
      birth_date,
      birth_year,
      current_age,
      season_year,
      age_group,
      age_group_auto,
      age_group_override,
      primary_position,
      position_label,
      preferred_foot,
      club_name,
      club_slug,
      club_route,
      club_status,
      visibility_public,
      is_active
    )
    values (
      parent_source_key,
      null,
      target_user_id,
      'parent',
      parent_profile.child_full_name,
      parent_profile.child_avatar_path,
      parent_profile.child_birth_date,
      extract(year from parent_profile.child_birth_date)::integer,
      coalesce(parent_profile.child_age, private.calculate_actual_age(parent_profile.child_birth_date)),
      private.current_season_year(),
      coalesce(
        private.normalize_age_group_key(parent_profile.child_age_group_override),
        private.normalize_age_group_key(parent_profile.child_age_group_auto),
        private.normalize_age_group_key(parent_profile.child_age_group),
        private.age_group_key_from_birth_date(parent_profile.child_birth_date, private.current_season_year()),
        'pro'
      ),
      coalesce(
        private.normalize_age_group_key(parent_profile.child_age_group_auto),
        private.normalize_age_group_key(parent_profile.child_age_group),
        private.age_group_key_from_birth_date(parent_profile.child_birth_date, private.current_season_year()),
        'pro'
      ),
      private.normalize_age_group_key(parent_profile.child_age_group_override),
      parent_profile.child_position,
      parent_profile.child_position_label,
      coalesce(parent_profile.child_preferred_foot, 'unknown'::public.preferred_foot),
      parent_profile.child_club_name,
      parent_profile.child_club_slug,
      parent_profile.child_club_route,
      parent_profile.child_club_status,
      true,
      true
    )
    on conflict (source_key) do update
    set
      owner_user_id = excluded.owner_user_id,
      owner_role = excluded.owner_role,
      full_name = excluded.full_name,
      avatar_path = coalesce(excluded.avatar_path, public.player_registry.avatar_path),
      birth_date = coalesce(excluded.birth_date, public.player_registry.birth_date),
      birth_year = coalesce(excluded.birth_year, public.player_registry.birth_year),
      current_age = coalesce(excluded.current_age, public.player_registry.current_age),
      season_year = excluded.season_year,
      age_group = excluded.age_group,
      age_group_auto = excluded.age_group_auto,
      age_group_override = excluded.age_group_override,
      primary_position = coalesce(excluded.primary_position, public.player_registry.primary_position),
      position_label = coalesce(excluded.position_label, public.player_registry.position_label),
      preferred_foot = coalesce(excluded.preferred_foot, public.player_registry.preferred_foot),
      club_name = coalesce(excluded.club_name, public.player_registry.club_name),
      club_slug = coalesce(excluded.club_slug, public.player_registry.club_slug),
      club_route = coalesce(excluded.club_route, public.player_registry.club_route),
      club_status = coalesce(excluded.club_status, public.player_registry.club_status),
      visibility_public = excluded.visibility_public,
      is_active = excluded.is_active,
      updated_at = timezone('utc', now());

    delete from public.player_registry
    where source_key = auth_source_key
      and auth_user_id = target_user_id
      and owner_role <> 'player';
  else
    delete from public.player_registry
    where source_key in (auth_source_key, parent_source_key)
      and owner_user_id = target_user_id;
  end if;
end;
$$;

create or replace function public.sync_my_account_domain()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  synced_entry public.player_registry%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  perform private.bootstrap_user(auth.uid());
  perform private.sync_extended_profile_fields(auth.uid());
  perform private.sync_player_registry_entry(auth.uid());

  select *
  into synced_entry
  from public.player_registry
  where auth_user_id = auth.uid()
     or owner_user_id = auth.uid()
  order by case when auth_user_id = auth.uid() then 0 else 1 end, updated_at desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'player_id', synced_entry.id,
    'source_key', synced_entry.source_key,
    'role', coalesce(synced_entry.owner_role::text, 'player')
  );
end;
$$;

grant execute on function public.sync_my_account_domain() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform private.bootstrap_user(new.id);
  perform private.sync_extended_profile_fields(new.id);
  perform private.sync_player_registry_entry(new.id);
  return new;
end;
$$;

alter table public.player_registry enable row level security;
alter table public.player_vote_totals enable row level security;
alter table public.player_votes enable row level security;

grant select on public.player_registry to anon, authenticated;
grant select on public.player_vote_totals to anon, authenticated;
grant select, insert on public.player_votes to authenticated;

drop policy if exists player_registry_public_read on public.player_registry;
create policy player_registry_public_read
on public.player_registry
for select
to public
using (visibility_public = true and is_active = true);

drop policy if exists player_registry_owner_read on public.player_registry;
create policy player_registry_owner_read
on public.player_registry
for select
to authenticated
using (owner_user_id = auth.uid() or auth_user_id = auth.uid() or private.is_admin());

drop policy if exists player_registry_owner_write on public.player_registry;
create policy player_registry_owner_write
on public.player_registry
for update
to authenticated
using (owner_user_id = auth.uid() or auth_user_id = auth.uid() or private.is_admin())
with check (owner_user_id = auth.uid() or auth_user_id = auth.uid() or private.is_admin());

drop policy if exists player_vote_totals_public_read on public.player_vote_totals;
create policy player_vote_totals_public_read
on public.player_vote_totals
for select
to public
using (true);

drop policy if exists player_votes_read_self on public.player_votes;
create policy player_votes_read_self
on public.player_votes
for select
to authenticated
using (voter_user_id = auth.uid() or private.is_admin());

drop policy if exists player_votes_insert_self on public.player_votes;
create policy player_votes_insert_self
on public.player_votes
for insert
to authenticated
with check (
  voter_user_id = auth.uid()
  and exists (
    select 1
    from public.player_registry pr
    where pr.id = player_id
      and pr.visibility_public = true
      and pr.is_active = true
  )
);

select private.bootstrap_user(id) from auth.users;
select private.sync_extended_profile_fields(id) from auth.users;
select private.sync_player_registry_entry(id) from auth.users;
insert into public.player_vote_totals (player_id, votes_count)
select pr.id, 0
from public.player_registry pr
on conflict (player_id) do nothing;
