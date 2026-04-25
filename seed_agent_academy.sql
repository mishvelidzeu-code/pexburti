-- ============================================================
-- 1 აგენტი + 1 გუნდის მენეჯერი (academy)
-- პაროლი: Test1234!
-- ============================================================
--   agent1@test.ge   — გიო მხეიძე, სპორტ-აგენტი
--   manager1@test.ge — ნიკა ბასილაშვილი, FC Saburtalo-ს მენეჯერი
-- ============================================================


-- ============================================================
-- 1. AUTH USERS
-- ============================================================

insert into auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  created_at, updated_at, aud, role
) values

-- აგენტი
(
  'a0000000-0000-0000-0000-00000000000e'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'agent1@test.ge',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  '{
    "full_name": "გიო მხეიძე",
    "first_name": "გიო",
    "last_name": "მხეიძე",
    "phone_number": "599111222",
    "role": "agent",
    "profile": {
      "agencyName": "Georgia Sports Agency",
      "agentLicenseNumber": "GEO-AGT-0042",
      "agentSpecialization": "pro",
      "agentRegion": "თბილისი"
    }
  }'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
),

-- გუნდის მენეჯერი (academy)
(
  'a0000000-0000-0000-0000-00000000000f'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'manager1@test.ge',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  '{
    "full_name": "ნიკა ბასილაშვილი",
    "first_name": "ნიკა",
    "last_name": "ბასილაშვილი",
    "phone_number": "599333444",
    "role": "academy",
    "profile": {
      "managerClubName": "FC Saburtalo",
      "managerCity": "თბილისი",
      "managerRoleTitle": "გუნდის მენეჯერი",
      "managerFocus": "U17-PRO",
      "managerClubSlug": "saburtalo",
      "managerClubRoute": "team-dinamo-tbilisi.html?club=saburtalo",
      "managerClubLogo": "",
      "managerRoster": [],
      "managerFavorites": [],
      "managerWatchlist": [],
      "managerNotes": []
    }
  }'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
);


-- ============================================================
-- 2. PROFILES
-- ============================================================

insert into public.profiles (id, role) values
  ('a0000000-0000-0000-0000-00000000000e'::uuid, 'agent'),
  ('a0000000-0000-0000-0000-00000000000f'::uuid, 'academy')
on conflict (id) do update set role = excluded.role;


-- ============================================================
-- შედეგის შემოწმება
-- ============================================================

select
  au.email,
  p.role,
  au.raw_user_meta_data->>'full_name'        as full_name,
  au.raw_user_meta_data->'profile'->>'managerClubName'  as manager_club,
  au.raw_user_meta_data->'profile'->>'agencyName'       as agency
from public.profiles p
join auth.users au on au.id = p.id
where p.role in ('agent', 'academy')
order by au.created_at desc
limit 5;
