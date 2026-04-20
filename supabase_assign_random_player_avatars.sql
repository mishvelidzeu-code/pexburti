with ordered_players as (
  select
    pr.id,
    pr.auth_user_id,
    pr.owner_user_id,
    pr.source_key,
    'https://i.pravatar.cc/400?img=' || (((row_number() over (order by pr.full_name, pr.id) - 1) % 70) + 1) as avatar_url
  from public.player_registry pr
  where pr.is_active = true
)
update public.player_registry pr
set avatar_path = op.avatar_url,
    updated_at = timezone('utc', now())
from ordered_players op
where pr.id = op.id;

with ordered_players as (
  select
    pr.auth_user_id,
    'https://i.pravatar.cc/400?img=' || (((row_number() over (order by pr.full_name, pr.id) - 1) % 70) + 1) as avatar_url
  from public.player_registry pr
  where pr.is_active = true
    and pr.auth_user_id is not null
)
update public.player_profiles pp
set avatar_path = op.avatar_url,
    updated_at = timezone('utc', now())
from ordered_players op
where pp.user_id = op.auth_user_id;

with ordered_children as (
  select
    pr.owner_user_id,
    pr.source_key,
    'https://i.pravatar.cc/400?img=' || (((row_number() over (order by pr.full_name, pr.id) - 1) % 70) + 1) as avatar_url
  from public.player_registry pr
  where pr.is_active = true
    and pr.owner_role = 'parent'
    and pr.owner_user_id is not null
)
update public.parent_profiles pp
set child_avatar_path = oc.avatar_url,
    updated_at = timezone('utc', now())
from ordered_children oc
where pp.user_id = oc.owner_user_id;
