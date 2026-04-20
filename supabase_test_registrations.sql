-- Test registrations seed
-- Run this AFTER:
-- 1. supabase_full_setup.sql
-- 2. supabase_backend_refactor.sql
--
-- This script creates:
-- - 10 player accounts
-- - 10 parent accounts
-- - 20 public footballer entries in player_registry
--
-- Default password for every seeded account:
-- Football123!

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'player_registry'
  ) then
    raise exception 'Run supabase_backend_refactor.sql first.';
  end if;
end $$;

create temporary table seed_auth_accounts (
  user_id uuid primary key,
  email text not null unique,
  password text not null,
  app_role public.user_role not null,
  first_name text not null,
  last_name text not null,
  personal_number text not null,
  phone_number text not null,
  profile_data jsonb not null
) on commit drop;

insert into seed_auth_accounts (
  user_id, email, password, app_role, first_name, last_name, personal_number, phone_number, profile_data
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'player01@seed.dm.local',
    'Football123!',
    'player',
    'Giorgi',
    'Mikeladze',
    '10000000001',
    '555100001',
    jsonb_build_object(
      'playerBirthDate', '2008-02-14',
      'playerPosition', 'forward',
      'playerFoot', 'right',
      'playerTeam', 'Dinamo Tbilisi',
      'playerTeamSlug', 'dinamo-tbilisi',
      'playerTeamRoute', 'team-dinamo-tbilisi.html',
      'playerTeamStatus', 'registered'
    )
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'player02@seed.dm.local',
    'Football123!',
    'player',
    'Luka',
    'Beridze',
    '10000000002',
    '555100002',
    jsonb_build_object(
      'playerBirthDate', '2009-03-21',
      'playerPosition', 'midfielder',
      'playerFoot', 'left',
      'playerTeam', 'Saburtalo Tbilisi',
      'playerTeamSlug', 'saburtalo-tbilisi',
      'playerTeamRoute', 'gundebi.html',
      'playerTeamStatus', 'registered'
    )
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'player03@seed.dm.local',
    'Football123!',
    'player',
    'Nika',
    'Kapanadze',
    '10000000003',
    '555100003',
    jsonb_build_object(
      'playerBirthDate', '2010-04-09',
      'playerPosition', 'defender',
      'playerFoot', 'right',
      'playerTeam', 'Dinamo Batumi',
      'playerTeamSlug', 'dinamo-batumi',
      'playerTeamRoute', 'gundebi.html',
      'playerTeamStatus', 'registered'
    )
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'player04@seed.dm.local',
    'Football123!',
    'player',
    'Saba',
    'Janelidze',
    '10000000004',
    '555100004',
    jsonb_build_object(
      'playerBirthDate', '2011-05-12',
      'playerPosition', 'goalkeeper',
      'playerFoot', 'right',
      'playerTeam', 'Telavi',
      'playerTeamSlug', 'telavi',
      'playerTeamRoute', 'gundebi.html',
      'playerTeamStatus', 'registered'
    )
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'player05@seed.dm.local',
    'Football123!',
    'player',
    'Data',
    'Gelashvili',
    '10000000005',
    '555100005',
    jsonb_build_object(
      'playerBirthDate', '2012-06-18',
      'playerPosition', 'forward',
      'playerFoot', 'both',
      'playerTeam', 'Iberia 1999',
      'playerTeamSlug', 'iberia-1999',
      'playerTeamRoute', 'gundebi.html',
      'playerTeamStatus', 'registered'
    )
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    'player06@seed.dm.local',
    'Football123!',
    'player',
    'Giga',
    'Chikvaidze',
    '10000000006',
    '555100006',
    jsonb_build_object(
      'playerBirthDate', '2013-07-27',
      'playerPosition', 'midfielder',
      'playerFoot', 'left',
      'playerTeam', 'Gareji Sagarejo',
      'playerTeamSlug', 'gareji-sagarejo',
      'playerTeamRoute', 'gundebi.html',
      'playerTeamStatus', 'registered'
    )
  ),
  (
    '10000000-0000-0000-0000-000000000007',
    'player07@seed.dm.local',
    'Football123!',
    'player',
    'Andria',
    'Tsereteli',
    '10000000007',
    '555100007',
    jsonb_build_object(
      'playerBirthDate', '2014-08-30',
      'playerPosition', 'defender',
      'playerFoot', 'right',
      'playerTeam', 'Lokomotivi Tbilisi',
      'playerTeamSlug', 'lokomotivi-tbilisi',
      'playerTeamRoute', 'gundebi.html',
      'playerTeamStatus', 'registered'
    )
  ),
  (
    '10000000-0000-0000-0000-000000000008',
    'player08@seed.dm.local',
    'Football123!',
    'player',
    'Mate',
    'Abashidze',
    '10000000008',
    '555100008',
    jsonb_build_object(
      'playerBirthDate', '2015-09-11',
      'playerPosition', 'forward',
      'playerFoot', 'left',
      'playerTeam', 'Kolkheti Poti',
      'playerTeamSlug', 'kolkheti-poti',
      'playerTeamRoute', 'gundebi.html',
      'playerTeamStatus', 'registered'
    )
  ),
  (
    '10000000-0000-0000-0000-000000000009',
    'player09@seed.dm.local',
    'Football123!',
    'player',
    'Ilia',
    'Nemsadze',
    '10000000009',
    '555100009',
    jsonb_build_object(
      'playerBirthDate', '2016-10-05',
      'playerPosition', 'midfielder',
      'playerFoot', 'both',
      'playerTeam', 'Samgurali Tskaltubo',
      'playerTeamSlug', 'samgurali-tskaltubo',
      'playerTeamRoute', 'gundebi.html',
      'playerTeamStatus', 'registered'
    )
  ),
  (
    '10000000-0000-0000-0000-000000000010',
    'player10@seed.dm.local',
    'Football123!',
    'player',
    'Sandro',
    'Kharadze',
    '10000000010',
    '555100010',
    jsonb_build_object(
      'playerBirthDate', '2017-11-24',
      'playerPosition', 'defender',
      'playerFoot', 'right',
      'playerTeam', 'Dinamo Tbilisi',
      'playerTeamSlug', 'dinamo-tbilisi',
      'playerTeamRoute', 'team-dinamo-tbilisi.html',
      'playerTeamStatus', 'registered'
    )
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    'parent01@seed.dm.local',
    'Football123!',
    'parent',
    'Tamar',
    'Mchedlishvili',
    '20000000001',
    '555200001',
    jsonb_build_object(
      'parentRelation', 'Mother',
      'childName', 'Nikoloz Mchedlishvili',
      'childBirthDate', '2007-02-19',
      'childPosition', 'midfielder',
      'childFoot', 'right',
      'childTeam', 'Dinamo Tbilisi',
      'childTeamSlug', 'dinamo-tbilisi',
      'childTeamRoute', 'team-dinamo-tbilisi.html',
      'childTeamStatus', 'registered'
    )
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'parent02@seed.dm.local',
    'Football123!',
    'parent',
    'Levan',
    'Kiknadze',
    '20000000002',
    '555200002',
    jsonb_build_object(
      'parentRelation', 'Father',
      'childName', 'Sandro Kiknadze',
      'childBirthDate', '2008-03-25',
      'childPosition', 'forward',
      'childFoot', 'left',
      'childTeam', 'Saburtalo Tbilisi',
      'childTeamSlug', 'saburtalo-tbilisi',
      'childTeamRoute', 'gundebi.html',
      'childTeamStatus', 'registered'
    )
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'parent03@seed.dm.local',
    'Football123!',
    'parent',
    'Nino',
    'Basilashvili',
    '20000000003',
    '555200003',
    jsonb_build_object(
      'parentRelation', 'Mother',
      'childName', 'Giorgi Basilashvili',
      'childBirthDate', '2009-04-17',
      'childPosition', 'defender',
      'childFoot', 'right',
      'childTeam', 'Dinamo Batumi',
      'childTeamSlug', 'dinamo-batumi',
      'childTeamRoute', 'gundebi.html',
      'childTeamStatus', 'registered'
    )
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    'parent04@seed.dm.local',
    'Football123!',
    'parent',
    'Irakli',
    'Gogoladze',
    '20000000004',
    '555200004',
    jsonb_build_object(
      'parentRelation', 'Father',
      'childName', 'Luka Gogoladze',
      'childBirthDate', '2010-05-08',
      'childPosition', 'goalkeeper',
      'childFoot', 'right',
      'childTeam', 'Telavi',
      'childTeamSlug', 'telavi',
      'childTeamRoute', 'gundebi.html',
      'childTeamStatus', 'registered'
    )
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    'parent05@seed.dm.local',
    'Football123!',
    'parent',
    'Maia',
    'Zviadauri',
    '20000000005',
    '555200005',
    jsonb_build_object(
      'parentRelation', 'Mother',
      'childName', 'Dato Zviadauri',
      'childBirthDate', '2011-06-29',
      'childPosition', 'forward',
      'childFoot', 'both',
      'childTeam', 'Iberia 1999',
      'childTeamSlug', 'iberia-1999',
      'childTeamRoute', 'gundebi.html',
      'childTeamStatus', 'registered'
    )
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    'parent06@seed.dm.local',
    'Football123!',
    'parent',
    'Gela',
    'Odisharia',
    '20000000006',
    '555200006',
    jsonb_build_object(
      'parentRelation', 'Father',
      'childName', 'Mate Odisharia',
      'childBirthDate', '2012-07-13',
      'childPosition', 'midfielder',
      'childFoot', 'left',
      'childTeam', 'Gareji Sagarejo',
      'childTeamSlug', 'gareji-sagarejo',
      'childTeamRoute', 'gundebi.html',
      'childTeamStatus', 'registered'
    )
  ),
  (
    '20000000-0000-0000-0000-000000000007',
    'parent07@seed.dm.local',
    'Football123!',
    'parent',
    'Sopho',
    'Kharshiladze',
    '20000000007',
    '555200007',
    jsonb_build_object(
      'parentRelation', 'Mother',
      'childName', 'Nika Kharshiladze',
      'childBirthDate', '2013-08-22',
      'childPosition', 'defender',
      'childFoot', 'right',
      'childTeam', 'Lokomotivi Tbilisi',
      'childTeamSlug', 'lokomotivi-tbilisi',
      'childTeamRoute', 'gundebi.html',
      'childTeamStatus', 'registered'
    )
  ),
  (
    '20000000-0000-0000-0000-000000000008',
    'parent08@seed.dm.local',
    'Football123!',
    'parent',
    'Kakha',
    'Shonia',
    '20000000008',
    '555200008',
    jsonb_build_object(
      'parentRelation', 'Father',
      'childName', 'Saba Shonia',
      'childBirthDate', '2014-09-16',
      'childPosition', 'forward',
      'childFoot', 'left',
      'childTeam', 'Kolkheti Poti',
      'childTeamSlug', 'kolkheti-poti',
      'childTeamRoute', 'gundebi.html',
      'childTeamStatus', 'registered'
    )
  ),
  (
    '20000000-0000-0000-0000-000000000009',
    'parent09@seed.dm.local',
    'Football123!',
    'parent',
    'Tatia',
    'Mestvirishvili',
    '20000000009',
    '555200009',
    jsonb_build_object(
      'parentRelation', 'Mother',
      'childName', 'Andria Mestvirishvili',
      'childBirthDate', '2015-10-04',
      'childPosition', 'midfielder',
      'childFoot', 'both',
      'childTeam', 'Samgurali Tskaltubo',
      'childTeamSlug', 'samgurali-tskaltubo',
      'childTeamRoute', 'gundebi.html',
      'childTeamStatus', 'registered'
    )
  ),
  (
    '20000000-0000-0000-0000-000000000010',
    'parent10@seed.dm.local',
    'Football123!',
    'parent',
    'Beka',
    'Sulava',
    '20000000010',
    '555200010',
    jsonb_build_object(
      'parentRelation', 'Father',
      'childName', 'Ilia Sulava',
      'childBirthDate', '2016-11-27',
      'childPosition', 'defender',
      'childFoot', 'right',
      'childTeam', 'Dinamo Tbilisi',
      'childTeamSlug', 'dinamo-tbilisi',
      'childTeamRoute', 'team-dinamo-tbilisi.html',
      'childTeamStatus', 'registered'
    )
  );

delete from auth.identities
where user_id in (
  select id
  from auth.users
  where email in (select email from seed_auth_accounts)
);

delete from auth.users
where email in (select email from seed_auth_accounts);

do $$
declare
  seed record;
  full_name text;
  accepted_at text;
  raw_meta jsonb;
begin
  for seed in
    select *
    from seed_auth_accounts
    order by email
  loop
    full_name := trim(seed.first_name || ' ' || seed.last_name);
    accepted_at := to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

    raw_meta := jsonb_build_object(
      'first_name', seed.first_name,
      'last_name', seed.last_name,
      'full_name', full_name,
      'personal_number', seed.personal_number,
      'phone_number', seed.phone_number,
      'accepted_terms', true,
      'accepted_terms_at', accepted_at,
      'role', seed.app_role::text,
      'profile', seed.profile_data
    );

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      seed.user_id,
      'authenticated',
      'authenticated',
      seed.email,
      crypt(seed.password, gen_salt('bf')),
      timezone('utc', now()),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      raw_meta,
      timezone('utc', now()),
      timezone('utc', now())
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      seed.user_id,
      seed.user_id,
      jsonb_build_object(
        'sub', seed.user_id::text,
        'email', seed.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      seed.email,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    );

    perform private.bootstrap_user(seed.user_id);
    perform private.sync_extended_profile_fields(seed.user_id);
    perform private.sync_player_registry_entry(seed.user_id);
  end loop;
end $$;

insert into public.player_vote_totals (player_id, votes_count)
select pr.id, 0
from public.player_registry pr
where pr.owner_user_id in (select user_id from seed_auth_accounts)
on conflict (player_id) do nothing;

with seeded_avatars(full_name, avatar_path) as (
  values
    ('Giorgi Mikeladze', 'seed-avatars/avatar-01.svg'),
    ('Luka Beridze', 'seed-avatars/avatar-02.svg'),
    ('Nika Kapanadze', 'seed-avatars/avatar-03.svg'),
    ('Saba Janelidze', 'seed-avatars/avatar-04.svg'),
    ('Data Gelashvili', 'seed-avatars/avatar-05.svg'),
    ('Giga Chikvaidze', 'seed-avatars/avatar-01.svg'),
    ('Andria Tsereteli', 'seed-avatars/avatar-02.svg'),
    ('Mate Abashidze', 'seed-avatars/avatar-03.svg'),
    ('Ilia Nemsadze', 'seed-avatars/avatar-04.svg'),
    ('Sandro Kharadze', 'seed-avatars/avatar-05.svg'),
    ('Nikoloz Mchedlishvili', 'seed-avatars/avatar-06.svg'),
    ('Sandro Kiknadze', 'seed-avatars/avatar-07.svg'),
    ('Giorgi Basilashvili', 'seed-avatars/avatar-08.svg'),
    ('Luka Gogoladze', 'seed-avatars/avatar-09.svg'),
    ('Dato Zviadauri', 'seed-avatars/avatar-10.svg'),
    ('Mate Odisharia', 'seed-avatars/avatar-06.svg'),
    ('Nika Kharshiladze', 'seed-avatars/avatar-07.svg'),
    ('Saba Shonia', 'seed-avatars/avatar-08.svg'),
    ('Andria Mestvirishvili', 'seed-avatars/avatar-09.svg'),
    ('Ilia Sulava', 'seed-avatars/avatar-10.svg')
),
updated_registry as (
  update public.player_registry pr
  set avatar_path = sa.avatar_path
  from seeded_avatars sa
  where lower(pr.full_name) = lower(sa.full_name)
    and pr.owner_user_id in (select user_id from seed_auth_accounts)
  returning pr.owner_user_id, pr.owner_role, pr.avatar_path
)
update public.player_profiles pp
set avatar_path = ur.avatar_path
from updated_registry ur
where ur.owner_role = 'player'
  and pp.user_id = ur.owner_user_id;

with seeded_avatars(full_name, avatar_path) as (
  values
    ('Nikoloz Mchedlishvili', 'seed-avatars/avatar-06.svg'),
    ('Sandro Kiknadze', 'seed-avatars/avatar-07.svg'),
    ('Giorgi Basilashvili', 'seed-avatars/avatar-08.svg'),
    ('Luka Gogoladze', 'seed-avatars/avatar-09.svg'),
    ('Dato Zviadauri', 'seed-avatars/avatar-10.svg'),
    ('Mate Odisharia', 'seed-avatars/avatar-06.svg'),
    ('Nika Kharshiladze', 'seed-avatars/avatar-07.svg'),
    ('Saba Shonia', 'seed-avatars/avatar-08.svg'),
    ('Andria Mestvirishvili', 'seed-avatars/avatar-09.svg'),
    ('Ilia Sulava', 'seed-avatars/avatar-10.svg')
)
update public.parent_profiles pp
set child_avatar_path = sa.avatar_path
from seeded_avatars sa
where lower(pp.child_full_name) = lower(sa.full_name)
  and pp.user_id in (select user_id from seed_auth_accounts where app_role = 'parent');

select
  p.email,
  p.role,
  pr.full_name as public_player_name,
  pr.age_group,
  pr.club_name
from public.profiles p
left join public.player_registry pr
  on pr.owner_user_id = p.id
where p.email in (select email from seed_auth_accounts)
order by p.email;
