-- ============================================================
-- სატესტო მონაცემები
-- ============================================================
-- 10  გუნდი  (clubs)
-- 8   ლოგინი (auth.users + identities + profiles)
--       admin@test.ge      — ადმინი
--       player1@test.ge    — მოთამაშე (GK, Dinamo, PRO)
--       player2@test.ge    — მოთამაშე (FW, Gagra, PRO)
--       player3@test.ge    — მოთამაშე (DF, Saburtalo, PRO)
--       player4@test.ge    — მოთამაშე (MF, Dila Gori, PRO)
--       player5@test.ge    — მოთამაშე (MF, თავისუფალი, PRO)
--       parent1@test.ge    — მშობელი (შვილი: დავით, Dinamo U15)
--       parent2@test.ge    — მშობელი (შვილი: სანდრო, Saburtalo U17)
-- ყველა პაროლი: Test1234!
-- იდემპოტენტური — მეორედ გაშვებაც უსაფრთხოა
-- ============================================================


-- ============================================================
-- 1. CLUBS
-- ============================================================
insert into public.clubs (
  id, slug, short_code, name, city, country,
  age_band, coach_name, players_count,
  logo_path, summary, is_public, is_active, created_at, updated_at
) values
  ('b0000001-0000-0000-0000-000000000001'::uuid, 'dinamo-tbilisi',      'DIN', 'FC Dinamo Tbilisi',      'თბილისი',  'Georgia', 'PRO', 'ბადრი ხოჯავა',     25, '', 'საქართველოს ყველაზე ტიტულოვანი კლუბი.',         true, true, now(), now()),
  ('b0000001-0000-0000-0000-000000000002'::uuid, 'lokomotivi-tbilisi',  'LOK', 'FC Lokomotivi Tbilisi', 'თბილისი',  'Georgia', 'PRO', 'ლევან შეკილაძე',   22, '', 'თბილისის ერთ-ერთი წამყვანი კლუბი.',             true, true, now(), now()),
  ('b0000001-0000-0000-0000-000000000003'::uuid, 'saburtalo',           'SAB', 'FC Saburtalo',          'თბილისი',  'Georgia', 'PRO', 'ლაშა სალაყაია',    20, '', 'სწრაფად მზარდი კლუბი თბილისიდან.',              true, true, now(), now()),
  ('b0000001-0000-0000-0000-000000000004'::uuid, 'torpedo-kutaisi',     'TOR', 'FC Torpedo Kutaisi',    'ქუთაისი',  'Georgia', 'PRO', 'გიორგი ხარაბაძე',  21, '', 'ქუთაისის ისტორიული კლუბი.',                     true, true, now(), now()),
  ('b0000001-0000-0000-0000-000000000005'::uuid, 'dila-gori',           'DIL', 'FC Dila Gori',          'გორი',     'Georgia', 'PRO', 'ვახტანგ ქვარაია',   20, '', 'გორის სიამაყე, ყოფილი ჩემპიონი.',               true, true, now(), now()),
  ('b0000001-0000-0000-0000-000000000006'::uuid, 'kolkheti-poti',       'KOL', 'FC Kolkheti Poti',      'ფოთი',     'Georgia', 'PRO', 'გიორგი ბერიძე',    18, '', 'ფოთის კლუბი, მდინარე რიონის სიახლოვეს.',        true, true, now(), now()),
  ('b0000001-0000-0000-0000-000000000007'::uuid, 'gagra',               'GAG', 'FC Gagra',              'თბილისი',  'Georgia', 'PRO', 'ლიორ მოახ',         24, '', 'უახლოესი წლების ყველაზე წარმატებული კლუბი.',    true, true, now(), now()),
  ('b0000001-0000-0000-0000-000000000008'::uuid, 'chikhura-sachkhere',  'CHI', 'FC Chikhura Sachkhere', 'საჩხერე',  'Georgia', 'PRO', 'ნიკა ტაბატაძე',    19, '', 'საჩხერის სიამაყე.',                              true, true, now(), now()),
  ('b0000001-0000-0000-0000-000000000009'::uuid, 'saburtalo-u17',       'SBU', 'FC Saburtalo U17',      'თბილისი',  'Georgia', 'U17', 'დათო ციკლაური',    16, '', 'Saburtalo-ის U17 ახალგაზრდული გუნდი.',           true, true, now(), now()),
  ('b0000001-0000-0000-0000-000000000010'::uuid, 'dinamo-u15',          'DNU', 'FC Dinamo U15',         'თბილისი',  'Georgia', 'U15', 'ნინო კვარაცხელია', 14, '', 'Dinamo-ს U15 ახალგაზრდული გუნდი.',               true, true, now(), now())
on conflict (slug) do nothing;


-- ============================================================
-- 2. AUTH USERS  (on conflict skip)
-- ============================================================
insert into auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  created_at, updated_at, aud, role
) values
  ('a0000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'admin@test.ge',   crypt('Test1234!', gen_salt('bf')), now(), '{"full_name":"ადმინი","role":"admin"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'player1@test.ge', crypt('Test1234!', gen_salt('bf')), now(), '{"full_name":"გიორგი მამულაშვილი","first_name":"გიორგი","last_name":"მამულაშვილი","role":"player","profile":{"playerTeam":"FC Dinamo Tbilisi","playerTeamSlug":"dinamo-tbilisi","playerPosition":"goalkeeper","playerFoot":"right","playerBirthDate":"2000-05-15","playerAge":"24","playerAgeCategory":"pro"}}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'player2@test.ge', crypt('Test1234!', gen_salt('bf')), now(), '{"full_name":"ლუკა კვარაცხელია","first_name":"ლუკა","last_name":"კვარაცხელია","role":"player","profile":{"playerTeam":"FC Gagra","playerTeamSlug":"gagra","playerPosition":"forward","playerFoot":"left","playerBirthDate":"2003-08-22","playerAge":"21","playerAgeCategory":"pro"}}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'player3@test.ge', crypt('Test1234!', gen_salt('bf')), now(), '{"full_name":"ნიკა გელოვანი","first_name":"ნიკა","last_name":"გელოვანი","role":"player","profile":{"playerTeam":"FC Saburtalo","playerTeamSlug":"saburtalo","playerPosition":"defender","playerFoot":"right","playerBirthDate":"1998-11-30","playerAge":"26","playerAgeCategory":"pro"}}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'player4@test.ge', crypt('Test1234!', gen_salt('bf')), now(), '{"full_name":"სოსო ხმელიძე","first_name":"სოსო","last_name":"ხმელიძე","role":"player","profile":{"playerTeam":"FC Dila Gori","playerTeamSlug":"dila-gori","playerPosition":"midfielder","playerFoot":"right","playerBirthDate":"2001-03-12","playerAge":"23","playerAgeCategory":"pro"}}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'player5@test.ge', crypt('Test1234!', gen_salt('bf')), now(), '{"full_name":"თამარ ჩიქოვანი","first_name":"თამარ","last_name":"ჩიქოვანი","role":"player","profile":{"playerTeam":"","playerTeamSlug":"","playerPosition":"midfielder","playerFoot":"left","playerBirthDate":"2004-07-08","playerAge":"20","playerAgeCategory":"pro"}}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'parent1@test.ge', crypt('Test1234!', gen_salt('bf')), now(), '{"full_name":"ნანა ბერიძე","role":"parent","profile":{"childName":"დავით ბერიძე","childTeam":"FC Dinamo U15","childTeamSlug":"dinamo-u15","childPosition":"midfielder","childFoot":"right","childBirthDate":"2010-06-20","childAge":"14","childAgeCategory":"u15"}}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'parent2@test.ge', crypt('Test1234!', gen_salt('bf')), now(), '{"full_name":"მარიამ ციხელაშვილი","role":"parent","profile":{"childName":"სანდრო ციხელაშვილი","childTeam":"FC Saburtalo U17","childTeamSlug":"saburtalo-u17","childPosition":"forward","childFoot":"left","childBirthDate":"2008-09-14","childAge":"16","childAgeCategory":"u17"}}'::jsonb, now(), now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;


-- ============================================================
-- 3. AUTH IDENTITIES  (login-ისთვის სავალდებულო)
-- ============================================================
insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select id, id, jsonb_build_object('sub', id::text, 'email', email), 'email', email, now(), now(), now()
from auth.users
where id in (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'a0000000-0000-0000-0000-000000000003'::uuid,
  'a0000000-0000-0000-0000-000000000004'::uuid,
  'a0000000-0000-0000-0000-000000000005'::uuid,
  'a0000000-0000-0000-0000-000000000006'::uuid,
  'a0000000-0000-0000-0000-000000000007'::uuid,
  'a0000000-0000-0000-0000-000000000008'::uuid
)
on conflict (provider, provider_id) do nothing;


-- ============================================================
-- 4. PROFILES
-- ============================================================
insert into public.profiles (id, role) values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'admin'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'player'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'player'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'player'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'player'),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'player'),
  ('a0000000-0000-0000-0000-000000000007'::uuid, 'parent'),
  ('a0000000-0000-0000-0000-000000000008'::uuid, 'parent')
on conflict (id) do update set role = excluded.role;


-- ============================================================
-- 5. SYNC → player_registry
-- ============================================================
do $$
declare uid uuid;
begin
  foreach uid in array array[
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'a0000000-0000-0000-0000-000000000004'::uuid,
    'a0000000-0000-0000-0000-000000000005'::uuid,
    'a0000000-0000-0000-0000-000000000006'::uuid,
    'a0000000-0000-0000-0000-000000000007'::uuid,
    'a0000000-0000-0000-0000-000000000008'::uuid
  ] loop
    perform public.sync_player_registry_from_auth_user(uid);
  end loop;
end;
$$;


-- ============================================================
-- 6. STANDALONE PLAYERS
-- ============================================================
insert into public.player_registry (
  id, source_key, auth_user_id, owner_user_id, owner_role,
  full_name, first_name, last_name,
  primary_position, position_label,
  club_name, club_slug, club_route, club_status,
  age_group, current_age, birth_year,
  visibility_public, is_active, created_at, updated_at
) values
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'standalone:ბახვა-ცქვიტინიძე', null, 'a0000000-0000-0000-0000-000000000001'::uuid, 'player', 'ბახვა ცქვიტინიძე', 'ბახვა', 'ცქვიტინიძე', 'defender'::public.player_position, 'defender', 'FC Torpedo Kutaisi', 'torpedo-kutaisi', 'team-dinamo-tbilisi.html?club=torpedo-kutaisi', 'registered', 'pro', 27, 1997, true, true, now(), now()),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'standalone:ლაშა-ჩიქოვანი',    null, 'a0000000-0000-0000-0000-000000000001'::uuid, 'player', 'ლაშა ჩიქოვანი',    'ლაშა',  'ჩიქოვანი',    'midfielder'::public.player_position, 'midfielder', 'FC Chikhura Sachkhere', 'chikhura-sachkhere', 'team-dinamo-tbilisi.html?club=chikhura-sachkhere', 'registered', 'pro', 25, 1999, true, true, now(), now()),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'standalone:ანი-სამხარაძე',    null, 'a0000000-0000-0000-0000-000000000001'::uuid, 'player', 'ანი სამხარაძე',    'ანი',   'სამხარაძე',   'forward'::public.player_position,   'forward',   'FC Kolkheti Poti',    'kolkheti-poti',    'team-dinamo-tbilisi.html?club=kolkheti-poti',    'registered', 'pro', 22, 2002, true, true, now(), now())
on conflict (source_key) do nothing;


-- ============================================================
-- 7. VOTE TOTALS
-- ============================================================
insert into public.player_vote_totals (player_id, votes_count)
select id, (floor(random() * 48) + 2)::int
from public.player_registry
where visibility_public = true and is_active = true
on conflict (player_id) do nothing;


-- შედეგი
select 'clubs'              as t, count(*) from public.clubs
union all select 'player_registry',  count(*) from public.player_registry where visibility_public = true
union all select 'player_vote_totals', count(*) from public.player_vote_totals
union all select 'profiles',          count(*) from public.profiles
union all select 'identities',        count(*) from auth.identities where provider = 'email';
