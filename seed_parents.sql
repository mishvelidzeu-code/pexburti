-- ============================================================
-- 5 მშობელი + 5 ბავშვი player_registry-ში
-- პაროლი ყველასი: Test1234!
-- ============================================================
--   parent3@test.ge  → შვილი: დავით ჯაფარიძე   (U13, Saburtalo,  MF)
--   parent4@test.ge  → შვილი: ანა ხიდაშელი     (U12, Dinamo,     FW)
--   parent5@test.ge  → შვილი: ლუკა ლომიძე      (U15, Gagra,      DF)
--   parent6@test.ge  → შვილი: თეკა ქობულაძე    (U14, Torpedo,    GK)
--   parent7@test.ge  → შვილი: სანდრო ჩხეიძე    (U16, Dila Gori,  MF)
-- ============================================================


-- ============================================================
-- 1. AUTH USERS
-- ============================================================

insert into auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  created_at, updated_at, aud, role
) values

-- parent3 → დავით ჯაფარიძე, U13, Saburtalo
(
  'a0000000-0000-0000-0000-000000000009'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'parent3@test.ge',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  '{"full_name":"ნინო ჯაფარიძე","role":"parent","profile":{"childName":"დავით ჯაფარიძე","childTeam":"FC Saburtalo","childTeamSlug":"saburtalo","childPosition":"midfielder","childFoot":"right","childBirthDate":"2012-04-10","childAge":"13","childAgeCategory":"u13"}}'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
),

-- parent4 → ანა ხიდაშელი, U12, Dinamo
(
  'a0000000-0000-0000-0000-00000000000a'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'parent4@test.ge',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  '{"full_name":"გიორგი ხიდაშელი","role":"parent","profile":{"childName":"ანა ხიდაშელი","childTeam":"FC Dinamo Tbilisi","childTeamSlug":"dinamo-tbilisi","childPosition":"forward","childFoot":"left","childBirthDate":"2013-07-22","childAge":"12","childAgeCategory":"u12"}}'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
),

-- parent5 → ლუკა ლომიძე, U15, Gagra
(
  'a0000000-0000-0000-0000-00000000000b'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'parent5@test.ge',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  '{"full_name":"მარინე ლომიძე","role":"parent","profile":{"childName":"ლუკა ლომიძე","childTeam":"FC Gagra","childTeamSlug":"gagra","childPosition":"defender","childFoot":"right","childBirthDate":"2010-11-05","childAge":"15","childAgeCategory":"u15"}}'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
),

-- parent6 → თეკა ქობულაძე, U14, Torpedo Kutaisi
(
  'a0000000-0000-0000-0000-00000000000c'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'parent6@test.ge',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  '{"full_name":"ზაზა ქობულაძე","role":"parent","profile":{"childName":"თეკა ქობულაძე","childTeam":"FC Torpedo Kutaisi","childTeamSlug":"torpedo-kutaisi","childPosition":"goalkeeper","childFoot":"right","childBirthDate":"2011-02-18","childAge":"14","childAgeCategory":"u14"}}'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
),

-- parent7 → სანდრო ჩხეიძე, U16, Dila Gori
(
  'a0000000-0000-0000-0000-00000000000d'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'parent7@test.ge',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  '{"full_name":"ეკა ჩხეიძე","role":"parent","profile":{"childName":"სანდრო ჩხეიძე","childTeam":"FC Dila Gori","childTeamSlug":"dila-gori","childPosition":"midfielder","childFoot":"left","childBirthDate":"2009-09-30","childAge":"16","childAgeCategory":"u16"}}'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
);


-- ============================================================
-- 2. PROFILES
-- ============================================================

insert into public.profiles (id, role) values
  ('a0000000-0000-0000-0000-000000000009'::uuid, 'parent'),
  ('a0000000-0000-0000-0000-00000000000a'::uuid, 'parent'),
  ('a0000000-0000-0000-0000-00000000000b'::uuid, 'parent'),
  ('a0000000-0000-0000-0000-00000000000c'::uuid, 'parent'),
  ('a0000000-0000-0000-0000-00000000000d'::uuid, 'parent')
on conflict (id) do update set role = excluded.role;


-- ============================================================
-- 3. SYNC → player_registry (5 ბავშვი)
-- ============================================================

do $$
declare
  uid uuid;
begin
  foreach uid in array array[
    'a0000000-0000-0000-0000-000000000009'::uuid,
    'a0000000-0000-0000-0000-00000000000a'::uuid,
    'a0000000-0000-0000-0000-00000000000b'::uuid,
    'a0000000-0000-0000-0000-00000000000c'::uuid,
    'a0000000-0000-0000-0000-00000000000d'::uuid
  ] loop
    perform public.sync_player_registry_from_auth_user(uid);
  end loop;
end;
$$;


-- ============================================================
-- შედეგის შემოწმება
-- ============================================================

select
  pr.full_name        as child,
  pr.age_group,
  pr.primary_position as position,
  pr.club_name        as club,
  pr.owner_role,
  au.email            as parent_email
from public.player_registry pr
join auth.users au on au.id = pr.owner_user_id
where pr.owner_role = 'parent'
order by pr.created_at desc
limit 10;
