create extension if not exists pgcrypto;

create table if not exists public.club_submission_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles (id) on delete set null,
  requester_email text,
  club_name text not null check (char_length(btrim(club_name)) > 1),
  city text not null check (char_length(btrim(city)) > 1),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  approved_club_id uuid references public.clubs (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.club_submission_requests
  alter column requested_by drop not null;

create index if not exists idx_club_submission_requests_status
  on public.club_submission_requests (status, created_at desc);

create index if not exists idx_club_submission_requests_requested_by
  on public.club_submission_requests (requested_by, created_at desc);

create or replace function private.make_club_request_slug(
  request_name text,
  request_city text,
  request_id uuid
)
returns text
language plpgsql
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix integer := 0;
begin
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        coalesce(request_name, '') || '-' || coalesce(request_city, ''),
        '[^[:alnum:]]+',
        '-',
        'g'
      ),
      '(^-|-$)',
      '',
      'g'
    )
  );

  if base_slug = '' then
    base_slug := 'club';
  end if;

  candidate_slug := base_slug || '-' || substr(md5(request_id::text), 1, 6);

  while exists (
    select 1
    from public.clubs
    where slug = candidate_slug
  ) loop
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || substr(md5(request_id::text), 1, 6) || '-' || suffix::text;
  end loop;

  return candidate_slug;
end;
$$;

create or replace function private.make_club_request_code(
  request_name text,
  request_city text,
  request_id uuid
)
returns text
language sql
as $$
  select upper(substr(md5(coalesce(request_name, '') || '-' || coalesce(request_city, '') || '-' || request_id::text), 1, 4));
$$;

create or replace function private.process_club_submission_request()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  matched_club_id uuid;
  generated_slug text;
  generated_code text;
begin
  new.updated_at := timezone('utc', now());

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.reviewed_at := timezone('utc', now());
    if auth.uid() is not null then
      new.reviewed_by := auth.uid();
    end if;
  end if;

  if new.status = 'approved' and (tg_op = 'INSERT' or coalesce(old.status, '') <> 'approved') then
    select c.id
    into matched_club_id
    from public.clubs c
    where lower(btrim(c.name)) = lower(btrim(new.club_name))
      and lower(btrim(coalesce(c.city, ''))) = lower(btrim(coalesce(new.city, '')))
    limit 1;

    if matched_club_id is null then
      generated_slug := private.make_club_request_slug(new.club_name, new.city, new.id);
      generated_code := private.make_club_request_code(new.club_name, new.city, new.id);

      insert into public.clubs (
        slug,
        short_code,
        name,
        city,
        country,
        age_band,
        coach_name,
        players_count,
        summary,
        is_public,
        is_active
      )
      values (
        generated_slug,
        generated_code,
        btrim(new.club_name),
        btrim(new.city),
        'Georgia',
        'U6-U17',
        'დასამატებელია',
        0,
        'მომხმარებლის მოთხოვნით დამატებული გუნდი.',
        true,
        true
      )
      returning id into matched_club_id;
    else
      update public.clubs
      set
        is_public = true,
        is_active = true,
        updated_at = timezone('utc', now())
      where id = matched_club_id;
    end if;

    new.approved_club_id := matched_club_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_process_club_submission_request on public.club_submission_requests;
create trigger trg_process_club_submission_request
before insert or update on public.club_submission_requests
for each row
execute function private.process_club_submission_request();

alter table public.club_submission_requests enable row level security;

grant insert on public.club_submission_requests to anon, authenticated;
grant select, update on public.club_submission_requests to authenticated;

drop policy if exists club_requests_select_own_or_admin on public.club_submission_requests;
create policy club_requests_select_own_or_admin
on public.club_submission_requests
for select
to authenticated
using (requested_by = auth.uid() or private.is_admin());

drop policy if exists club_requests_insert_public on public.club_submission_requests;
create policy club_requests_insert_public
on public.club_submission_requests
for insert
to public
with check (
  status = 'pending'
  and (
    (auth.uid() is null and requested_by is null)
    or requested_by = auth.uid()
  )
);

drop policy if exists club_requests_update_admin on public.club_submission_requests;
create policy club_requests_update_admin
on public.club_submission_requests
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());
