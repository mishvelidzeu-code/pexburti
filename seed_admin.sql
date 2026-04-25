-- ============================================================
-- ადმინი — admin@gmail.com / 123123123
-- იდემპოტენტური — მეორედ გაშვებაც უსაფრთხოა
-- ============================================================

insert into auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  created_at, updated_at, aud, role
) values (
  'a0000000-0000-0000-0000-000000000010'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@gmail.com',
  crypt('123123123', gen_salt('bf')),
  now(),
  '{"full_name":"ადმინი","role":"admin"}'::jsonb,
  now(), now(), 'authenticated', 'authenticated'
)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
values (
  'a0000000-0000-0000-0000-000000000010'::uuid,
  'a0000000-0000-0000-0000-000000000010'::uuid,
  '{"sub":"a0000000-0000-0000-0000-000000000010","email":"admin@gmail.com"}'::jsonb,
  'email',
  'admin@gmail.com',
  now(), now(), now()
)
on conflict (provider, provider_id) do nothing;

insert into public.profiles (id, email, role) values (
  'a0000000-0000-0000-0000-000000000010'::uuid,
  'admin@gmail.com',
  'admin'
)
on conflict (id) do update set role = 'admin';

-- შედეგი
select au.email, p.role
from public.profiles p
join auth.users au on au.id = p.id
where p.role = 'admin';
