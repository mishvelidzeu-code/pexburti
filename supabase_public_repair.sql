update public.clubs
set
  is_public = coalesce(is_public, true),
  is_active = coalesce(is_active, true)
where is_public is null
   or is_active is null;

update public.player_registry
set
  visibility_public = coalesce(visibility_public, true),
  is_active = coalesce(is_active, true)
where visibility_public is null
   or is_active is null;

create or replace function public.normalize_public_position(raw_value text)
returns public.player_position
language sql
immutable
as $$
  select (
    case
      when lower(trim(coalesce(raw_value, ''))) in ('gk', 'goalkeeper') then 'goalkeeper'
      when lower(trim(coalesce(raw_value, ''))) in ('df', 'defender') then 'defender'
      when lower(trim(coalesce(raw_value, ''))) in ('fw', 'forward') then 'forward'
      else 'midfielder'
    end
  )::public.player_position;
$$;

create or replace function public.slugify_public_text(raw_value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    regexp_replace(lower(coalesce(raw_value, '')), '[^a-z0-9\s-]', '', 'g'),
    '\s+',
    '-',
    'g'
  ));
$$;

create or replace function public.parse_public_birth_date(raw_value text)
returns date
language sql
immutable
as $$
  select
    case
      when raw_value is null or btrim(raw_value) = '' then null
      when raw_value ~ '^\d{4}-\d{2}-\d{2}$' then raw_value::date
      when raw_value ~ '^\d{2}\.\d{2}\.\d{4}$' then to_date(raw_value, 'DD.MM.YYYY')
      else null
    end;
$$;

create or replace function public.normalize_public_age_group(raw_value text)
returns text
language sql
immutable
as $$
  select
    case
      when raw_value is null or btrim(raw_value) = '' then 'pro'
      when lower(btrim(raw_value)) in ('pro', 'professional') then 'pro'
      when lower(btrim(raw_value)) in ('u8','u9','u10','u11','u12','u13','u14','u15','u16','u17','u19') then lower(btrim(raw_value))
      when lower(btrim(raw_value)) = 'u18' then 'u19'
      else 'pro'
    end;
$$;

-- Safe text-to-preferred_foot cast: returns NULL instead of raising on unknown values
create or replace function public.safe_cast_preferred_foot(raw_value text)
returns public.preferred_foot
language plpgsql
immutable
as $$
begin
  if raw_value is null or btrim(raw_value) = '' then
    return null;
  end if;
  return btrim(lower(raw_value))::public.preferred_foot;
exception when invalid_text_representation then
  return null;
end;
$$;

update public.player_registry
set
  age_group = public.normalize_public_age_group(age_group),
  age_group_auto = public.normalize_public_age_group(age_group_auto),
  age_group_override = case
    when age_group_override is null or btrim(age_group_override) = '' then null
    else public.normalize_public_age_group(age_group_override)
  end;

create or replace function public.sync_player_registry_from_auth_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_row auth.users%rowtype;
  profile_role text;
  meta jsonb;
  profile jsonb;
  current_year int := extract(year from now())::int;
  player_name text;
  player_team text;
  player_team_slug text;
  child_name text;
  child_team text;
  child_team_slug text;
  existing_player_id uuid;
  existing_child_id uuid;
begin
  select *
  into auth_row
  from auth.users
  where id = target_user_id;

  if not found then
    return;
  end if;

  select role
  into profile_role
  from public.profiles
  where id = target_user_id;

  meta := coalesce(auth_row.raw_user_meta_data, '{}'::jsonb);
  profile := coalesce(meta -> 'profile', '{}'::jsonb);
  profile_role := coalesce(profile_role, meta ->> 'role', 'player');

  if profile_role = 'player' then
    -- Safe name construction: concat_ws skips NULLs, nullif converts empty strings to NULL
    player_name := btrim(coalesce(
      nullif(btrim(meta ->> 'full_name'), ''),
      nullif(concat_ws(' ',
        nullif(btrim(meta ->> 'first_name'), ''),
        nullif(btrim(meta ->> 'last_name'), '')
      ), '')
    ));
    player_team := nullif(coalesce(profile ->> 'playerTeam', ''), '');
    player_team_slug := public.slugify_public_text(coalesce(profile ->> 'playerTeamSlug', player_team));

    select pr.id
    into existing_player_id
    from public.player_registry pr
    where pr.source_key = 'player:' || target_user_id::text
       or pr.auth_user_id = target_user_id
       or pr.owner_user_id = target_user_id
    order by pr.updated_at desc nulls last
    limit 1;

    if existing_player_id is not null then
      update public.player_registry
      set
        source_key = 'player:' || target_user_id::text,
        auth_user_id = target_user_id,
        owner_user_id = target_user_id,
        owner_role = 'player',
        full_name = coalesce(nullif(player_name, ''), 'Unknown Player'),
        first_name = coalesce(nullif(meta ->> 'first_name', ''), split_part(player_name, ' ', 1)),
        last_name = nullif(trim(replace(coalesce(player_name, ''), split_part(coalesce(player_name, ''), ' ', 1), '')), ''),
        avatar_path = coalesce(nullif(profile ->> 'profilePhoto', ''), avatar_path),
        birth_date = public.parse_public_birth_date(profile ->> 'playerBirthDate'),
        birth_year = nullif(profile ->> 'playerBirthYear', '')::int,
        current_age = nullif(profile ->> 'playerAge', '')::int,
        season_year = coalesce(nullif(profile ->> 'playerAgeSeasonYear', '')::int, current_year),
        age_group = public.normalize_public_age_group(profile ->> 'playerAgeCategory'),
        age_group_auto = public.normalize_public_age_group(profile ->> 'playerAgeCategoryAuto'),
        age_group_override = case
          when nullif(profile ->> 'playerAgeCategoryOverride', '') is null then null
          else public.normalize_public_age_group(profile ->> 'playerAgeCategoryOverride')
        end,
        primary_position = public.normalize_public_position(coalesce(profile ->> 'playerPosition', 'midfielder')),
        position_label = coalesce(nullif(profile ->> 'playerPosition', ''), 'midfielder'),
        preferred_foot = coalesce(public.safe_cast_preferred_foot(profile ->> 'playerFoot'), preferred_foot),
        club_name = player_team,
        club_slug = nullif(player_team_slug, ''),
        club_route = case
          when nullif(player_team_slug, '') is null then ''
          when player_team_slug = 'dinamo-tbilisi' then 'team-dinamo-tbilisi.html'
          else 'team-dinamo-tbilisi.html?club=' || player_team_slug
        end,
        club_status = coalesce(nullif(profile ->> 'playerTeamStatus', ''), case when player_team is null then 'free-agent' else 'registered' end),
        visibility_public = true,
        is_active = true,
        updated_at = timezone('utc', now())
      where id = existing_player_id;
    else
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
        club_name,
        club_slug,
        club_route,
        club_status,
        visibility_public,
        is_active,
        created_at,
        updated_at
      )
      values (
        'player:' || target_user_id::text,
        target_user_id,
        target_user_id,
        'player',
        coalesce(nullif(player_name, ''), 'Unknown Player'),
        coalesce(nullif(meta ->> 'first_name', ''), split_part(player_name, ' ', 1)),
        nullif(trim(replace(coalesce(player_name, ''), split_part(coalesce(player_name, ''), ' ', 1), '')), ''),
        nullif(profile ->> 'profilePhoto', ''),
        public.parse_public_birth_date(profile ->> 'playerBirthDate'),
        nullif(profile ->> 'playerBirthYear', '')::int,
        nullif(profile ->> 'playerAge', '')::int,
        coalesce(nullif(profile ->> 'playerAgeSeasonYear', '')::int, current_year),
        public.normalize_public_age_group(profile ->> 'playerAgeCategory'),
        public.normalize_public_age_group(profile ->> 'playerAgeCategoryAuto'),
        case
          when nullif(profile ->> 'playerAgeCategoryOverride', '') is null then null
          else public.normalize_public_age_group(profile ->> 'playerAgeCategoryOverride')
        end,
        public.normalize_public_position(coalesce(profile ->> 'playerPosition', 'midfielder')),
        coalesce(nullif(profile ->> 'playerPosition', ''), 'midfielder'),
        public.safe_cast_preferred_foot(profile ->> 'playerFoot'),
        player_team,
        nullif(player_team_slug, ''),
        case
          when nullif(player_team_slug, '') is null then ''
          when player_team_slug = 'dinamo-tbilisi' then 'team-dinamo-tbilisi.html'
          else 'team-dinamo-tbilisi.html?club=' || player_team_slug
        end,
        coalesce(nullif(profile ->> 'playerTeamStatus', ''), case when player_team is null then 'free-agent' else 'registered' end),
        true,
        true,
        coalesce(auth_row.created_at, timezone('utc', now())),
        timezone('utc', now())
      );
    end if;

  elsif profile_role = 'parent' then
    child_name := btrim(coalesce(nullif(btrim(profile ->> 'childName'), ''), ''));
    child_team := nullif(coalesce(profile ->> 'childTeam', ''), '');
    child_team_slug := public.slugify_public_text(coalesce(profile ->> 'childTeamSlug', child_team));

    if nullif(child_name, '') is not null then
      select pr.id
      into existing_child_id
      from public.player_registry pr
      where pr.source_key = 'parent-child:' || target_user_id::text
         or (pr.owner_user_id = target_user_id and pr.owner_role = 'parent')
      order by pr.updated_at desc nulls last
      limit 1;

      if existing_child_id is not null then
        update public.player_registry
        set
          source_key = 'parent-child:' || target_user_id::text,
          auth_user_id = null,
          owner_user_id = target_user_id,
          owner_role = 'parent',
          full_name = child_name,
          first_name = split_part(child_name, ' ', 1),
          last_name = nullif(trim(replace(child_name, split_part(child_name, ' ', 1), '')), ''),
          avatar_path = coalesce(nullif(profile ->> 'childPhoto', ''), avatar_path),
          birth_date = public.parse_public_birth_date(profile ->> 'childBirthDate'),
          birth_year = nullif(profile ->> 'childBirthYear', '')::int,
          current_age = nullif(profile ->> 'childAge', '')::int,
          season_year = coalesce(nullif(profile ->> 'childAgeSeasonYear', '')::int, current_year),
          age_group = public.normalize_public_age_group(profile ->> 'childAgeCategory'),
          age_group_auto = public.normalize_public_age_group(profile ->> 'childAgeCategoryAuto'),
          age_group_override = case
            when nullif(profile ->> 'childAgeCategoryOverride', '') is null then null
            else public.normalize_public_age_group(profile ->> 'childAgeCategoryOverride')
          end,
          primary_position = public.normalize_public_position(coalesce(profile ->> 'childPosition', 'midfielder')),
          position_label = coalesce(nullif(profile ->> 'childPosition', ''), 'midfielder'),
          preferred_foot = coalesce(public.safe_cast_preferred_foot(profile ->> 'childFoot'), preferred_foot),
          club_name = child_team,
          club_slug = nullif(child_team_slug, ''),
          club_route = case
            when nullif(child_team_slug, '') is null then ''
            when child_team_slug = 'dinamo-tbilisi' then 'team-dinamo-tbilisi.html'
            else 'team-dinamo-tbilisi.html?club=' || child_team_slug
          end,
          club_status = coalesce(nullif(profile ->> 'childTeamStatus', ''), case when child_team is null then 'free-agent' else 'registered' end),
          visibility_public = true,
          is_active = true,
          updated_at = timezone('utc', now())
        where id = existing_child_id;
      else
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
          club_name,
          club_slug,
          club_route,
          club_status,
          visibility_public,
          is_active,
          created_at,
          updated_at
        )
        values (
          'parent-child:' || target_user_id::text,
          null,
          target_user_id,
          'parent',
          child_name,
          split_part(child_name, ' ', 1),
          nullif(trim(replace(child_name, split_part(child_name, ' ', 1), '')), ''),
          nullif(profile ->> 'childPhoto', ''),
          public.parse_public_birth_date(profile ->> 'childBirthDate'),
          nullif(profile ->> 'childBirthYear', '')::int,
          nullif(profile ->> 'childAge', '')::int,
          coalesce(nullif(profile ->> 'childAgeSeasonYear', '')::int, current_year),
          public.normalize_public_age_group(profile ->> 'childAgeCategory'),
          public.normalize_public_age_group(profile ->> 'childAgeCategoryAuto'),
          case
            when nullif(profile ->> 'childAgeCategoryOverride', '') is null then null
            else public.normalize_public_age_group(profile ->> 'childAgeCategoryOverride')
          end,
          public.normalize_public_position(coalesce(profile ->> 'childPosition', 'midfielder')),
          coalesce(nullif(profile ->> 'childPosition', ''), 'midfielder'),
          public.safe_cast_preferred_foot(profile ->> 'childFoot'),
          child_team,
          nullif(child_team_slug, ''),
          case
            when nullif(child_team_slug, '') is null then ''
            when child_team_slug = 'dinamo-tbilisi' then 'team-dinamo-tbilisi.html'
            else 'team-dinamo-tbilisi.html?club=' || child_team_slug
          end,
          coalesce(nullif(profile ->> 'childTeamStatus', ''), case when child_team is null then 'free-agent' else 'registered' end),
          true,
          true,
          coalesce(auth_row.created_at, timezone('utc', now())),
          timezone('utc', now())
        );
      end if;
    end if;
  end if;
end;
$$;

create or replace function public.sync_my_account_domain()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_player_registry_from_auth_user(auth.uid());
  return jsonb_build_object('ok', true, 'user_id', auth.uid());
end;
$$;

-- Batch sync all player and parent users from auth into player_registry
do $$
declare
  auth_row record;
begin
  for auth_row in
    select u.id
    from auth.users u
    join public.profiles p on p.id = u.id
    where p.role in ('player', 'parent')
  loop
    perform public.sync_player_registry_from_auth_user(auth_row.id);
  end loop;
end;
$$;

-- Migrate player_profiles rows that have no corresponding registry entry yet
-- Uses WHERE NOT EXISTS to avoid ON CONFLICT on auth_user_id (which can be NULL)
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
  current_age,
  season_year,
  age_group,
  primary_position,
  position_label,
  club_name,
  club_slug,
  club_route,
  club_status,
  visibility_public,
  is_active,
  created_at,
  updated_at
)
select
  'profile:' || pp.user_id::text as source_key,
  pp.user_id as auth_user_id,
  pp.user_id as owner_user_id,
  'player' as owner_role,
  coalesce(j ->> 'display_name', j ->> 'full_name', 'Unknown Player') as full_name,
  split_part(coalesce(j ->> 'display_name', j ->> 'full_name', ''), ' ', 1) as first_name,
  nullif(trim(replace(coalesce(j ->> 'display_name', j ->> 'full_name', ''), split_part(coalesce(j ->> 'display_name', j ->> 'full_name', ''), ' ', 1), '')), '') as last_name,
  nullif(j ->> 'avatar_path', '') as avatar_path,
  public.parse_public_birth_date(j ->> 'birth_date') as birth_date,
  nullif(j ->> 'age', '')::integer as current_age,
  extract(year from now())::integer as season_year,
  public.normalize_public_age_group(j ->> 'age_group') as age_group,
  public.normalize_public_position(coalesce(j ->> 'primary_position', j ->> 'position', 'midfielder')) as primary_position,
  coalesce(nullif(j ->> 'position_label', ''), nullif(j ->> 'primary_position', ''), nullif(j ->> 'position', ''), 'midfielder') as position_label,
  coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', '')) as club_name,
  nullif(public.slugify_public_text(coalesce(nullif(j ->> 'club_slug', ''), coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', '')))), '') as club_slug,
  case
    when nullif(public.slugify_public_text(coalesce(nullif(j ->> 'club_slug', ''), coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', '')))), '') is null then ''
    when public.slugify_public_text(coalesce(nullif(j ->> 'club_slug', ''), coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', '')))) = 'dinamo-tbilisi' then 'team-dinamo-tbilisi.html'
    else 'team-dinamo-tbilisi.html?club=' || public.slugify_public_text(coalesce(nullif(j ->> 'club_slug', ''), coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', ''))))
  end as club_route,
  case
    when coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', '')) is null then 'free-agent'
    else 'registered'
  end as club_status,
  true as visibility_public,
  true as is_active,
  timezone('utc', now()) as created_at,
  timezone('utc', now()) as updated_at
from public.player_profiles pp
cross join lateral to_jsonb(pp) as j
where not exists (
  select 1
  from public.player_registry pr
  where pr.source_key = 'profile:' || pp.user_id::text
     or pr.auth_user_id = pp.user_id
);

-- ============================================================
-- RLS POLICIES
-- Ensures anon visitors can read public data and owners can
-- manage their own entries. Enable RLS first, then add policies.
-- ============================================================

-- player_registry
alter table public.player_registry enable row level security;

drop policy if exists "anon_read_public_players" on public.player_registry;
create policy "anon_read_public_players"
  on public.player_registry
  for select
  to anon, authenticated
  using (visibility_public = true and is_active = true);

drop policy if exists "owner_manage_own_player" on public.player_registry;
create policy "owner_manage_own_player"
  on public.player_registry
  for all
  to authenticated
  using (
    owner_user_id = auth.uid()
    or auth_user_id = auth.uid()
  )
  with check (
    owner_user_id = auth.uid()
    or auth_user_id = auth.uid()
  );

-- clubs
alter table public.clubs enable row level security;

drop policy if exists "anon_read_public_clubs" on public.clubs;
create policy "anon_read_public_clubs"
  on public.clubs
  for select
  to anon, authenticated
  using (is_public = true and is_active = true);

-- player_vote_totals (read-only for everyone)
alter table public.player_vote_totals enable row level security;

drop policy if exists "anon_read_vote_totals" on public.player_vote_totals;
create policy "anon_read_vote_totals"
  on public.player_vote_totals
  for select
  to anon, authenticated
  using (true);

-- player_vote_manual_overrides (read-only for everyone)
alter table public.player_vote_manual_overrides enable row level security;

drop policy if exists "anon_read_vote_overrides" on public.player_vote_manual_overrides;
create policy "anon_read_vote_overrides"
  on public.player_vote_manual_overrides
  for select
  to anon, authenticated
  using (true);

-- player_votes (authenticated users can insert and read own votes)
alter table public.player_votes enable row level security;

drop policy if exists "authenticated_insert_own_vote" on public.player_votes;
create policy "authenticated_insert_own_vote"
  on public.player_votes
  for insert
  to authenticated
  with check (voter_user_id = auth.uid());

drop policy if exists "authenticated_read_own_votes" on public.player_votes;
create policy "authenticated_read_own_votes"
  on public.player_votes
  for select
  to authenticated
  using (voter_user_id = auth.uid());
