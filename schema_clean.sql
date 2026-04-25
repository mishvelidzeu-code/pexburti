-- ============================================================
-- Football Georgia — სუფთა სქემა
-- გაუშვი Supabase SQL Editor-ში ერთი გასროლით
-- ============================================================


-- ============================================================
-- 0. DROP — ყველაფერი იქ, ასე ასწვდება მოშლილ state-ს
-- ============================================================

drop table if exists public.monthly_featured_snapshots    cascade;
drop table if exists public.player_vote_manual_overrides  cascade;
drop table if exists public.player_vote_totals            cascade;
drop table if exists public.player_votes                  cascade;
drop table if exists public.club_submission_requests      cascade;
drop table if exists public.player_registry               cascade;
drop table if exists public.player_profiles               cascade;
drop table if exists public.clubs                         cascade;
drop table if exists public.profiles                      cascade;

drop type if exists public.player_position cascade;

drop function if exists public.is_admin()                                    cascade;
drop function if exists public.handle_new_user()                             cascade;
drop function if exists public.update_vote_totals()                          cascade;
drop function if exists public.sync_my_account_domain()                      cascade;
drop function if exists public.sync_player_registry_from_auth_user(uuid)     cascade;
drop function if exists public.get_or_create_monthly_featured_snapshot()     cascade;


-- ============================================================
-- 1. ENUM
-- ============================================================

create type public.player_position as enum (
  'goalkeeper',
  'defender',
  'midfielder',
  'forward'
);


-- ============================================================
-- 2. TABLES
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
-- ყოველი auth.users-ისთვის ერთი ჩანაწერი: id + role + email
create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text,
  role       text        not null default 'player'
               check (role in ('player','parent','agent','academy','admin')),
  created_at timestamptz not null default now()
);

-- ── clubs ─────────────────────────────────────────────────────
create table public.clubs (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  short_code    text,
  name          text        not null,
  city          text,
  country       text        not null default 'Georgia',
  age_band      text        not null default 'U8-PRO',
  coach_name    text,
  players_count int         not null default 0,
  logo_path     text,
  summary       text,
  is_public     boolean     not null default true,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── player_registry ───────────────────────────────────────────
-- მთავარი საჯარო მოთამაშეების ბაზა
create table public.player_registry (
  id                  uuid                   primary key default gen_random_uuid(),
  source_key          text                   unique,          -- 'auth:<uid>' | 'parent:<uid>' | 'standalone:<name>'
  auth_user_id        uuid                   references auth.users(id) on delete set null,
  owner_user_id       uuid                   references auth.users(id) on delete set null,
  owner_role          text                   not null default 'player'
                        check (owner_role in ('player','parent','admin')),
  full_name           text                   not null,
  first_name          text,
  last_name           text,
  avatar_path         text,
  birth_date          date,
  birth_year          int,
  current_age         int,
  season_year         int,
  age_group           text                   not null default 'pro',
  age_group_auto      text,
  age_group_override  text,
  primary_position    public.player_position not null default 'midfielder',
  position_label      text,
  preferred_foot      text                   check (preferred_foot in ('left','right','both') or preferred_foot is null),
  club_name           text,
  club_slug           text,
  club_route          text,
  club_status         text                   default 'free-agent'
                        check (club_status in ('registered','free-agent')),
  visibility_public   boolean                not null default true,
  is_active           boolean                not null default true,
  created_at          timestamptz            not null default now(),
  updated_at          timestamptz            not null default now()
);

-- ── player_profiles ───────────────────────────────────────────
-- სარეზერვო/ძველი ცხრილი — fallback როდესაც player_registry ცარიელია
create table public.player_profiles (
  user_id           uuid        primary key references auth.users(id) on delete cascade,
  display_name      text,
  full_name         text,
  avatar_path       text,
  age_group         text,
  primary_position  text,
  position          text,
  position_label    text,
  preferred_foot    text,
  foot              text,
  club_name         text,
  current_club      text,
  team_name         text,
  club_slug         text,
  birth_date        date,
  age               int,
  visibility_public boolean     not null default true,
  is_active         boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── player_votes ──────────────────────────────────────────────
create table public.player_votes (
  id             uuid        primary key default gen_random_uuid(),
  player_id      uuid        not null references public.player_registry(id) on delete cascade,
  voter_user_id  uuid        not null,
  created_at     timestamptz not null default now(),
  unique (player_id, voter_user_id)
);

-- ── player_vote_totals ────────────────────────────────────────
create table public.player_vote_totals (
  player_id   uuid        primary key references public.player_registry(id) on delete cascade,
  votes_count int         not null default 0,
  updated_at  timestamptz not null default now()
);

-- ── player_vote_manual_overrides ──────────────────────────────
create table public.player_vote_manual_overrides (
  player_id    uuid        primary key references public.player_registry(id) on delete cascade,
  manual_votes int         not null default 0,
  updated_by   uuid        references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now()
);

-- ── club_submission_requests ──────────────────────────────────
create table public.club_submission_requests (
  id              uuid        primary key default gen_random_uuid(),
  requested_by    uuid        references auth.users(id) on delete set null,
  requester_email text,
  requester_name  text,
  requester_role  text,
  club_name       text        not null,
  city            text        not null,
  phone           text        not null,
  status          text        not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  public_club_slug text,
  admin_note      text,
  approved_at     timestamptz,
  approved_by     uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ── monthly_featured_snapshots ────────────────────────────────
create table public.monthly_featured_snapshots (
  cycle_key                 text        primary key,         -- 'YYYY-MM'
  cycle_start               date        not null,
  cycle_end                 date        not null,
  featured_player_id        uuid        references public.player_registry(id) on delete set null,
  manual_featured_player_id uuid        references public.player_registry(id) on delete set null,
  featured_votes            int         not null default 0,
  lineup                    jsonb,      -- [{slot, player_id}, ...]
  manual_lineup             jsonb,
  updated_by                uuid        references auth.users(id) on delete set null,
  updated_at                timestamptz not null default now()
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

create index on public.player_registry (auth_user_id);
create index on public.player_registry (owner_user_id);
create index on public.player_registry (club_slug);
create index on public.player_registry (age_group);
create index on public.player_registry (primary_position);
create index on public.player_registry (visibility_public, is_active);
create index on public.player_votes (voter_user_id);
create index on public.clubs (is_public, is_active);
create index on public.club_submission_requests (status);


-- ============================================================
-- 4. HELPER FUNCTION
-- ============================================================

-- is_admin() — RLS-ში გამოიყენება (security definer, no RLS loop)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


-- ============================================================
-- 5. TRIGGER: ახალი მომხმარებელი → profiles
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_role text;
begin
  raw_role := coalesce(new.raw_user_meta_data->>'role', 'player');

  if raw_role not in ('player','parent','agent','academy','admin') then
    raw_role := 'player';
  end if;

  insert into public.profiles (id, email, role, created_at)
  values (new.id, new.email, raw_role, now())
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- 6. TRIGGER: ხმა → player_vote_totals
-- ============================================================

create or replace function public.update_vote_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.player_vote_totals (player_id, votes_count, updated_at)
  values (new.player_id, 1, now())
  on conflict (player_id) do update
    set votes_count = player_vote_totals.votes_count + 1,
        updated_at  = now();
  return new;
end;
$$;

drop trigger if exists on_player_vote_insert on public.player_votes;
create trigger on_player_vote_insert
  after insert on public.player_votes
  for each row execute function public.update_vote_totals();


-- ============================================================
-- 7. RPC: sync_player_registry_from_auth_user(uid)
--    seed data-სა და admin-სთვის — ნებისმიერი user-ის sync
-- ============================================================

create or replace function public.sync_player_registry_from_auth_user(target_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  meta          jsonb;
  prof          jsonb;
  user_role     text;
  p_full_name   text;
  p_first_name  text;
  p_last_name   text;
  p_position    text;
  p_foot        text;
  p_birth_date  date;
  p_birth_year  int;
  p_current_age int;
  p_age_group   text;
  p_club_name   text;
  p_club_slug   text;
  p_club_route  text;
  p_club_status text;
  p_owner_role  text;
  p_auth_uid    uuid;
  p_source      text;
begin
  select raw_user_meta_data into meta
  from auth.users where id = target_uid;

  if meta is null then return; end if;

  user_role := coalesce(meta->>'role', 'player');

  if user_role = 'parent' then
    prof          := meta->'profile';
    p_full_name   := coalesce(prof->>'childName', '');
    p_first_name  := split_part(p_full_name, ' ', 1);
    p_last_name   := ltrim(substring(p_full_name from length(p_first_name) + 2));
    p_position    := coalesce(prof->>'childPosition', 'midfielder');
    p_foot        := coalesce(prof->>'childFoot', '');
    p_age_group   := coalesce(prof->>'childAgeCategory', 'u8');
    p_club_name   := coalesce(prof->>'childTeam', '');
    p_club_slug   := coalesce(prof->>'childTeamSlug', '');
    p_owner_role  := 'parent';
    p_auth_uid    := null;
    p_source      := 'parent:' || target_uid::text;
    begin
      p_birth_date  := (prof->>'childBirthDate')::date;
      p_birth_year  := extract(year from p_birth_date)::int;
      p_current_age := extract(year from age(p_birth_date))::int;
    exception when others then
      p_birth_date  := null;
      p_birth_year  := null;
      p_current_age := (prof->>'childAge')::int;
    end;
  else
    prof          := meta->'profile';
    p_full_name   := coalesce(meta->>'full_name', '');
    p_first_name  := coalesce(meta->>'first_name', split_part(p_full_name,' ',1));
    p_last_name   := coalesce(meta->>'last_name',  ltrim(substring(p_full_name from length(split_part(p_full_name,' ',1)) + 2)));
    p_position    := coalesce(prof->>'playerPosition', 'midfielder');
    p_foot        := coalesce(prof->>'playerFoot', '');
    p_age_group   := coalesce(prof->>'playerAgeCategory', 'pro');
    p_club_name   := coalesce(prof->>'playerTeam', '');
    p_club_slug   := coalesce(prof->>'playerTeamSlug', '');
    p_owner_role  := 'player';
    p_auth_uid    := target_uid;
    p_source      := 'auth:' || target_uid::text;
    begin
      p_birth_date  := (prof->>'playerBirthDate')::date;
      p_birth_year  := extract(year from p_birth_date)::int;
      p_current_age := extract(year from age(p_birth_date))::int;
    exception when others then
      p_birth_date  := null;
      p_birth_year  := null;
      p_current_age := (prof->>'playerAge')::int;
    end;
  end if;

  if p_full_name = '' then return; end if;

  -- normalize position
  p_position := case lower(p_position)
    when 'gk'         then 'goalkeeper'
    when 'goalkeeper' then 'goalkeeper'
    when 'df'         then 'defender'
    when 'defender'   then 'defender'
    when 'fw'         then 'forward'
    when 'forward'    then 'forward'
    when 'mf'         then 'midfielder'
    else 'midfielder'
  end;

  -- club route
  p_club_route  := case
    when p_club_slug = 'dinamo-tbilisi' then 'team-dinamo-tbilisi.html'
    when p_club_slug <> ''             then 'team-dinamo-tbilisi.html?club=' || p_club_slug
    else ''
  end;
  p_club_status := case when p_club_slug <> '' then 'registered' else 'free-agent' end;

  insert into public.player_registry (
    source_key, auth_user_id, owner_user_id, owner_role,
    full_name, first_name, last_name,
    primary_position, position_label, preferred_foot,
    birth_date, birth_year, current_age, age_group,
    club_name, club_slug, club_route, club_status,
    visibility_public, is_active, updated_at
  ) values (
    p_source, p_auth_uid, target_uid, p_owner_role,
    p_full_name, p_first_name, p_last_name,
    p_position::public.player_position, p_position,
    case when p_foot in ('left','right','both') then p_foot else null end,
    p_birth_date, p_birth_year, p_current_age, p_age_group,
    p_club_name, p_club_slug, p_club_route, p_club_status,
    true, true, now()
  )
  on conflict (source_key) do update set
    full_name        = excluded.full_name,
    first_name       = excluded.first_name,
    last_name        = excluded.last_name,
    primary_position = excluded.primary_position,
    position_label   = excluded.position_label,
    preferred_foot   = excluded.preferred_foot,
    birth_date       = excluded.birth_date,
    birth_year       = excluded.birth_year,
    current_age      = excluded.current_age,
    age_group        = excluded.age_group,
    club_name        = excluded.club_name,
    club_slug        = excluded.club_slug,
    club_route       = excluded.club_route,
    club_status      = excluded.club_status,
    auth_user_id     = excluded.auth_user_id,
    owner_user_id    = excluded.owner_user_id,
    updated_at       = now();

exception when others then
  null; -- silently ignore to avoid blocking seed loops
end;
$$;


-- ============================================================
-- 8. RPC: sync_my_account_domain()
--    ავტორიზებული მომხმარებელი sync-ავს საკუთარ მონაცემს
-- ============================================================

create or replace function public.sync_my_account_domain()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  perform public.sync_player_registry_from_auth_user(uid);
end;
$$;


-- ============================================================
-- 9. RPC: get_or_create_monthly_featured_snapshot()
--    თვის featured player + lineup — საჯარო
-- ============================================================

create or replace function public.get_or_create_monthly_featured_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today         date    := current_date;
  v_cycle_key   text    := to_char(today, 'YYYY-MM');
  v_start       date    := date_trunc('month', today)::date;
  v_end         date    := (date_trunc('month', today) + interval '1 month - 1 day')::date;
  snap          record;
  auto_player   uuid;
  auto_votes    int;
begin
  -- შექმნა თუ არ არსებობს
  insert into public.monthly_featured_snapshots (cycle_key, cycle_start, cycle_end)
  values (v_cycle_key, v_start, v_end)
  on conflict (cycle_key) do nothing;

  select * into snap
  from public.monthly_featured_snapshots
  where cycle_key = v_cycle_key;

  -- auto: highest votes
  select
    pvt.player_id,
    coalesce(pvt.votes_count, 0) + coalesce(pvo.manual_votes, 0) as total
  into auto_player, auto_votes
  from public.player_vote_totals pvt
  join public.player_registry pr on pr.id = pvt.player_id
  left join public.player_vote_manual_overrides pvo on pvo.player_id = pvt.player_id
  where pr.visibility_public = true and pr.is_active = true
  order by total desc
  limit 1;

  return jsonb_build_object(
    'cycle_key',                 snap.cycle_key,
    'cycle_start',               snap.cycle_start,
    'cycle_end',                 snap.cycle_end,
    'featured_player_id',        coalesce(snap.manual_featured_player_id, auto_player),
    'manual_featured_player_id', snap.manual_featured_player_id,
    'featured_votes',            coalesce(auto_votes, snap.featured_votes, 0),
    'lineup',                    coalesce(snap.manual_lineup, snap.lineup),
    'manual_lineup',             snap.manual_lineup,
    'updated_at',                snap.updated_at
  );
end;
$$;


-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles                    enable row level security;
alter table public.clubs                       enable row level security;
alter table public.player_registry             enable row level security;
alter table public.player_profiles             enable row level security;
alter table public.player_votes                enable row level security;
alter table public.player_vote_totals          enable row level security;
alter table public.player_vote_manual_overrides enable row level security;
alter table public.club_submission_requests    enable row level security;
alter table public.monthly_featured_snapshots  enable row level security;


-- ── profiles ─────────────────────────────────────────────────

create policy "profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: admin update role"
  on public.profiles for update
  using (public.is_admin());

-- Insert: trigger (service role) — users cannot insert directly


-- ── clubs ─────────────────────────────────────────────────────

create policy "clubs: public read"
  on public.clubs for select
  using ((is_public = true and is_active = true) or public.is_admin());

create policy "clubs: admin insert"
  on public.clubs for insert
  with check (public.is_admin());

create policy "clubs: admin update"
  on public.clubs for update
  using (public.is_admin());

create policy "clubs: admin delete"
  on public.clubs for delete
  using (public.is_admin());


-- ── player_registry ───────────────────────────────────────────

create policy "player_registry: public read"
  on public.player_registry for select
  using (
    (visibility_public = true and is_active = true)
    or auth_user_id  = auth.uid()
    or owner_user_id = auth.uid()
    or public.is_admin()
  );

create policy "player_registry: owner or admin insert"
  on public.player_registry for insert
  with check (
    owner_user_id = auth.uid()
    or auth_user_id = auth.uid()
    or public.is_admin()
  );

create policy "player_registry: owner or admin update"
  on public.player_registry for update
  using (
    auth_user_id  = auth.uid()
    or owner_user_id = auth.uid()
    or public.is_admin()
  );

create policy "player_registry: admin delete"
  on public.player_registry for delete
  using (public.is_admin());


-- ── player_profiles ───────────────────────────────────────────
-- საჯარო fallback კითხვა (სიის გვერდი)

create policy "player_profiles: public read"
  on public.player_profiles for select
  using (visibility_public = true or user_id = auth.uid() or public.is_admin());

create policy "player_profiles: own insert"
  on public.player_profiles for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy "player_profiles: own or admin update"
  on public.player_profiles for update
  using (user_id = auth.uid() or public.is_admin());


-- ── player_votes ──────────────────────────────────────────────

create policy "player_votes: read own or admin"
  on public.player_votes for select
  using (voter_user_id = auth.uid() or public.is_admin());

create policy "player_votes: authenticated insert"
  on public.player_votes for insert
  with check (voter_user_id = auth.uid());


-- ── player_vote_totals ────────────────────────────────────────
-- ყველა კითხულობს, მხოლოდ trigger (security definer) წერს

create policy "player_vote_totals: public read"
  on public.player_vote_totals for select
  using (true);


-- ── player_vote_manual_overrides ──────────────────────────────
-- ყველა კითხულობს (ranking-ში), admin წერს

create policy "player_vote_manual_overrides: public read"
  on public.player_vote_manual_overrides for select
  using (true);

create policy "player_vote_manual_overrides: admin write"
  on public.player_vote_manual_overrides for insert
  with check (public.is_admin());

create policy "player_vote_manual_overrides: admin update"
  on public.player_vote_manual_overrides for update
  using (public.is_admin());


-- ── club_submission_requests ──────────────────────────────────

create policy "club_submission_requests: anyone insert"
  on public.club_submission_requests for insert
  with check (true);

create policy "club_submission_requests: own or admin read"
  on public.club_submission_requests for select
  using (requested_by = auth.uid() or public.is_admin());

create policy "club_submission_requests: admin update"
  on public.club_submission_requests for update
  using (public.is_admin());


-- ── monthly_featured_snapshots ────────────────────────────────

create policy "monthly_featured_snapshots: public read"
  on public.monthly_featured_snapshots for select
  using (true);

create policy "monthly_featured_snapshots: rpc insert"
  on public.monthly_featured_snapshots for insert
  with check (true);      -- security definer RPC ქმნის, RLS bypass

create policy "monthly_featured_snapshots: admin update"
  on public.monthly_featured_snapshots for update
  using (public.is_admin());


-- ============================================================
-- 11. GRANT — anon + authenticated შეუძლიათ RPC-ების გამოძახება
-- ============================================================

grant execute on function public.sync_my_account_domain()                  to authenticated;
grant execute on function public.sync_player_registry_from_auth_user(uuid) to authenticated;
grant execute on function public.get_or_create_monthly_featured_snapshot() to anon, authenticated;


-- ============================================================
-- დასრულდა — run seed_test_data.sql test მონაცემებისთვის
-- ============================================================
