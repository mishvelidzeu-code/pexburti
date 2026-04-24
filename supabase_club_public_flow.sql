alter table if exists public.club_submission_requests
  add column if not exists public_club_slug text,
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
