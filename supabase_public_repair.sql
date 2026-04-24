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

insert into public.player_registry (
  source_key,
  auth_user_id,
  owner_user_id,
  owner_role,
  full_name,
  first_name,
  last_name,
  avatar_path,
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
  coalesce(j ->> 'display_name', j ->> 'full_name', 'უსახელო მოთამაშე') as full_name,
  split_part(coalesce(j ->> 'display_name', j ->> 'full_name', ''), ' ', 1) as first_name,
  nullif(trim(replace(coalesce(j ->> 'display_name', j ->> 'full_name', ''), split_part(coalesce(j ->> 'display_name', j ->> 'full_name', ''), ' ', 1), '')), '') as last_name,
  nullif(j ->> 'avatar_path', '') as avatar_path,
  nullif(j ->> 'age', '')::integer as current_age,
  extract(year from now())::integer as season_year,
  lower(coalesce(nullif(j ->> 'age_group', ''), 'pro')) as age_group,
  (
    case
      when lower(coalesce(nullif(j ->> 'primary_position', ''), nullif(j ->> 'position', ''), 'midfielder')) in ('gk', 'goalkeeper', 'მეკარე') then 'goalkeeper'
      when lower(coalesce(nullif(j ->> 'primary_position', ''), nullif(j ->> 'position', ''), 'midfielder')) in ('df', 'defender', 'დამცველი') then 'defender'
      when lower(coalesce(nullif(j ->> 'primary_position', ''), nullif(j ->> 'position', ''), 'midfielder')) in ('fw', 'forward', 'თავდამსხმელი') then 'forward'
      else 'midfielder'
    end
  )::public.player_position as primary_position,
  coalesce(nullif(j ->> 'position_label', ''), nullif(j ->> 'primary_position', ''), nullif(j ->> 'position', ''), 'midfielder') as position_label,
  coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', '')) as club_name,
  lower(
    regexp_replace(
      regexp_replace(
        coalesce(nullif(j ->> 'club_slug', ''), coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', ''))),
        '[^a-zA-Z0-9აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ\s-]',
        '',
        'g'
      ),
      '\s+',
      '-',
      'g'
    )
  ) as club_slug,
  case
    when coalesce(nullif(j ->> 'club_slug', ''), coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', ''))) is null then ''
    else
      'team-dinamo-tbilisi.html?club=' ||
      lower(
        regexp_replace(
          regexp_replace(
            coalesce(nullif(j ->> 'club_slug', ''), coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', ''))),
            '[^a-zA-Z0-9აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ\s-]',
            '',
            'g'
          ),
          '\s+',
          '-',
          'g'
        )
      )
  end as club_route,
  case
    when coalesce(nullif(j ->> 'club_name', ''), nullif(j ->> 'current_club', ''), nullif(j ->> 'team_name', '')) is null then 'free-agent'
    else 'registered'
  end as club_status,
  true as visibility_public,
  true as is_active,
  coalesce((j ->> 'created_at')::timestamptz, timezone('utc', now())) as created_at,
  coalesce((j ->> 'updated_at')::timestamptz, timezone('utc', now())) as updated_at
from public.player_profiles pp
cross join lateral to_jsonb(pp) as j
where not exists (
  select 1
  from public.player_registry pr
  where pr.source_key = 'profile:' || pp.user_id::text
     or pr.auth_user_id = pp.user_id
     or pr.owner_user_id = pp.user_id
);
