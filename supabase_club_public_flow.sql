alter table if exists public.club_submission_requests
  add column if not exists public_club_slug text,
  add column if not exists requester_name text,
  add column if not exists requester_role text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

create unique index if not exists club_submission_requests_public_club_slug_key
  on public.club_submission_requests (public_club_slug)
  where public_club_slug is not null;

alter table if exists public.clubs enable row level security;

drop policy if exists clubs_public_read on public.clubs;
create policy clubs_public_read
on public.clubs
for select
using (coalesce(is_public, false) = true and coalesce(is_active, false) = true);

drop policy if exists clubs_admin_write on public.clubs;
create policy clubs_admin_write
on public.clubs
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists club_requests_admin_read on public.club_submission_requests;
create policy club_requests_admin_read
on public.club_submission_requests
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
  or requested_by = auth.uid()
);

drop policy if exists club_requests_admin_update on public.club_submission_requests;
create policy club_requests_admin_update
on public.club_submission_requests
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

alter table if exists public.player_registry enable row level security;

drop policy if exists player_registry_admin_read on public.player_registry;
create policy player_registry_admin_read
on public.player_registry
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists player_registry_admin_update on public.player_registry;
create policy player_registry_admin_update
on public.player_registry
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

alter table if exists public.profiles enable row level security;

drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read
on public.profiles
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
on public.profiles
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create table if not exists public.player_vote_manual_overrides (
  player_id uuid primary key references public.player_registry(id) on delete cascade,
  manual_votes integer not null default 0,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.player_vote_manual_overrides enable row level security;

drop policy if exists player_vote_manual_overrides_public_read on public.player_vote_manual_overrides;
create policy player_vote_manual_overrides_public_read
on public.player_vote_manual_overrides
for select
using (true);

drop policy if exists player_vote_manual_overrides_admin_write on public.player_vote_manual_overrides;
create policy player_vote_manual_overrides_admin_write
on public.player_vote_manual_overrides
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create table if not exists public.monthly_featured_snapshots (
  cycle_key text primary key,
  cycle_start date not null,
  cycle_end date not null,
  featured_player_id uuid references public.player_registry(id) on delete set null,
  featured_votes integer not null default 0,
  lineup jsonb not null default '[]'::jsonb,
  manual_featured_player_id uuid references public.player_registry(id) on delete set null,
  manual_lineup jsonb,
  locked_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.monthly_featured_snapshots enable row level security;

drop policy if exists monthly_featured_snapshots_public_read on public.monthly_featured_snapshots;
create policy monthly_featured_snapshots_public_read
on public.monthly_featured_snapshots
for select
using (true);

drop policy if exists monthly_featured_snapshots_admin_write on public.monthly_featured_snapshots;
create policy monthly_featured_snapshots_admin_write
on public.monthly_featured_snapshots
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create or replace function public.get_or_create_monthly_featured_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cycle_start date;
  cycle_end date;
  current_cycle_key text;
  snapshot_row public.monthly_featured_snapshots%rowtype;
  auto_featured_id uuid;
  auto_featured_votes integer := 0;
  auto_lineup jsonb := '[]'::jsonb;
begin
  if extract(day from current_date) >= 28 then
    cycle_start := make_date(extract(year from current_date)::int, extract(month from current_date)::int, 28);
  else
    cycle_start := (date_trunc('month', current_date)::date - interval '1 month')::date;
    cycle_start := make_date(extract(year from cycle_start)::int, extract(month from cycle_start)::int, 28);
  end if;

  cycle_end := (cycle_start + interval '1 month')::date - 1;
  current_cycle_key := to_char(cycle_start, 'YYYY-MM-DD');

  select *
  into snapshot_row
  from public.monthly_featured_snapshots
  where cycle_key = current_cycle_key;

  if not found then
    with effective_votes as (
      select
        pr.id,
        pr.primary_position,
        pr.updated_at,
        coalesce(pvt.votes_count, 0) + coalesce(pmo.manual_votes, 0) as effective_votes
      from public.player_registry pr
      left join public.player_vote_totals pvt on pvt.player_id = pr.id
      left join public.player_vote_manual_overrides pmo on pmo.player_id = pr.id
      where coalesce(pr.visibility_public, false) = true
        and coalesce(pr.is_active, false) = true
    ), featured as (
      select id, effective_votes
      from effective_votes
      order by effective_votes desc, updated_at desc, id
      limit 1
    ), lineup_pool as (
      select
        id,
        case
          when lower(coalesce(primary_position, '')) like '%goal%' or lower(coalesce(primary_position, '')) = 'gk' then 'goalkeeper'
          when lower(coalesce(primary_position, '')) like '%def%' or lower(coalesce(primary_position, '')) = 'df' then 'defender'
          when lower(coalesce(primary_position, '')) like '%for%' or lower(coalesce(primary_position, '')) = 'fw' then 'forward'
          else 'midfielder'
        end as position_key,
        effective_votes,
        updated_at
      from effective_votes
    ), ranked as (
      select
        id,
        position_key,
        effective_votes,
        row_number() over (partition by position_key order by effective_votes desc, updated_at desc, id) as position_rank
      from lineup_pool
    ), chosen as (
      select 'gk'::text as slot, id, effective_votes from ranked where position_key = 'goalkeeper' and position_rank = 1
      union all
      select 'rb', id, effective_votes from ranked where position_key = 'defender' and position_rank = 1
      union all
      select 'rcb', id, effective_votes from ranked where position_key = 'defender' and position_rank = 2
      union all
      select 'lcb', id, effective_votes from ranked where position_key = 'defender' and position_rank = 3
      union all
      select 'lb', id, effective_votes from ranked where position_key = 'defender' and position_rank = 4
      union all
      select 'rcm', id, effective_votes from ranked where position_key = 'midfielder' and position_rank = 1
      union all
      select 'cm', id, effective_votes from ranked where position_key = 'midfielder' and position_rank = 2
      union all
      select 'lcm', id, effective_votes from ranked where position_key = 'midfielder' and position_rank = 3
      union all
      select 'rw', id, effective_votes from ranked where position_key = 'forward' and position_rank = 1
      union all
      select 'st', id, effective_votes from ranked where position_key = 'forward' and position_rank = 2
      union all
      select 'lw', id, effective_votes from ranked where position_key = 'forward' and position_rank = 3
    )
    select
      (select id from featured),
      coalesce((select effective_votes from featured), 0),
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'slot', slot,
              'player_id', id,
              'votes', effective_votes
            )
            order by slot
          )
          from chosen
        ),
        '[]'::jsonb
      )
    into auto_featured_id, auto_featured_votes, auto_lineup;

    insert into public.monthly_featured_snapshots (
      cycle_key,
      cycle_start,
      cycle_end,
      featured_player_id,
      featured_votes,
      lineup
    ) values (
      current_cycle_key,
      cycle_start,
      cycle_end,
      auto_featured_id,
      auto_featured_votes,
      auto_lineup
    );

    select *
    into snapshot_row
    from public.monthly_featured_snapshots
    where cycle_key = current_cycle_key;
  end if;

  return jsonb_build_object(
    'cycle_key', snapshot_row.cycle_key,
    'cycle_start', snapshot_row.cycle_start,
    'cycle_end', snapshot_row.cycle_end,
    'featured_player_id', coalesce(snapshot_row.manual_featured_player_id, snapshot_row.featured_player_id),
    'featured_votes', snapshot_row.featured_votes,
    'lineup', coalesce(snapshot_row.manual_lineup, snapshot_row.lineup),
    'locked_at', snapshot_row.locked_at
  );
end;
$$;

grant execute on function public.get_or_create_monthly_featured_snapshot() to anon, authenticated;
