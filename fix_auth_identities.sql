-- ============================================================
-- FIX: auth.identities — Supabase-ში login-ისთვის სავალდებულოა
-- SQL-ით პირდაპირ auth.users-ში ჩასმულ user-ებს არ ეწერებათ
-- ეს ფაილი ყველა seed user-ს ამატებს identities-ში
-- ============================================================

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
select
  id,                                                          -- identity id = user id
  id,                                                          -- user_id
  jsonb_build_object('sub', id::text, 'email', email),        -- identity_data
  'email',                                                     -- provider
  email,                                                       -- provider_id
  now(),
  now(),
  now()
from auth.users
where id in (
  -- seed_test_data.sql users
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'a0000000-0000-0000-0000-000000000003'::uuid,
  'a0000000-0000-0000-0000-000000000004'::uuid,
  'a0000000-0000-0000-0000-000000000005'::uuid,
  'a0000000-0000-0000-0000-000000000006'::uuid,
  'a0000000-0000-0000-0000-000000000007'::uuid,
  'a0000000-0000-0000-0000-000000000008'::uuid,
  -- seed_parents.sql users
  'a0000000-0000-0000-0000-000000000009'::uuid,
  'a0000000-0000-0000-0000-00000000000a'::uuid,
  'a0000000-0000-0000-0000-00000000000b'::uuid,
  'a0000000-0000-0000-0000-00000000000c'::uuid,
  'a0000000-0000-0000-0000-00000000000d'::uuid,
  -- seed_agent_academy.sql users
  'a0000000-0000-0000-0000-00000000000e'::uuid,
  'a0000000-0000-0000-0000-00000000000f'::uuid,
  -- seed_admin.sql
  'a0000000-0000-0000-0000-000000000010'::uuid
)
on conflict (provider, provider_id) do nothing;


-- შედეგი
select
  au.email,
  p.role,
  ai.provider
from auth.users au
join public.profiles p  on p.id  = au.id
join auth.identities ai on ai.user_id = au.id
where au.id in (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'a0000000-0000-0000-0000-000000000002'::uuid,
  'a0000000-0000-0000-0000-000000000003'::uuid,
  'a0000000-0000-0000-0000-000000000004'::uuid,
  'a0000000-0000-0000-0000-000000000005'::uuid,
  'a0000000-0000-0000-0000-000000000006'::uuid,
  'a0000000-0000-0000-0000-000000000007'::uuid,
  'a0000000-0000-0000-0000-000000000008'::uuid,
  'a0000000-0000-0000-0000-000000000009'::uuid,
  'a0000000-0000-0000-0000-00000000000a'::uuid,
  'a0000000-0000-0000-0000-00000000000b'::uuid,
  'a0000000-0000-0000-0000-00000000000c'::uuid,
  'a0000000-0000-0000-0000-00000000000d'::uuid,
  'a0000000-0000-0000-0000-00000000000e'::uuid,
  'a0000000-0000-0000-0000-00000000000f'::uuid,
  'a0000000-0000-0000-0000-000000000010'::uuid
)
order by p.role, au.email;
