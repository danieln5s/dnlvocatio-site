-- Email-verified photo access.
--
-- Design notes:
--   * All access records live in the `private` schema. PostgREST only exposes
--     `public` (and `graphql_public`), so nothing in here is reachable from the
--     browser even with a valid visitor session.
--   * The Edge Function writes records through SECURITY DEFINER functions in
--     `public` whose EXECUTE privilege is granted to `service_role` only.
--   * Identity is never taken from the browser: the function resolves the email
--     from `auth.users`, and the timestamp is the database `now()`.

-- ---------------------------------------------------------------------------
-- Private schema
-- ---------------------------------------------------------------------------

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Authentication events (recorded separately from photo access)
-- ---------------------------------------------------------------------------

create table if not exists private.auth_event_log (
  id           bigint generated always as identity primary key,
  user_id      uuid        not null,
  email        text,
  event_type   text        not null check (event_type in ('user_created', 'email_verified_sign_in')),
  occurred_at  timestamptz not null default now()
);

create index if not exists auth_event_log_occurred_at_idx
  on private.auth_event_log (occurred_at desc);

create index if not exists auth_event_log_user_idx
  on private.auth_event_log (user_id, occurred_at desc);

alter table private.auth_event_log enable row level security;
revoke all on table private.auth_event_log from anon, authenticated;

comment on table private.auth_event_log is
  'One row per successful inbox verification / account creation. Written by a trigger on auth.users.';

-- ---------------------------------------------------------------------------
-- Photo access requests
-- ---------------------------------------------------------------------------

create table if not exists private.photo_access_log (
  id           bigint generated always as identity primary key,
  user_id      uuid        not null,
  email        text        not null,
  session_id   uuid,
  event_type   text        not null check (event_type in ('photo_request', 'gallery_request')),
  gallery      text        not null,
  photo_path   text        not null,
  outcome      text        not null check (outcome in ('allowed', 'denied', 'not_found')),
  occurred_at  timestamptz not null default now()
);

create index if not exists photo_access_log_occurred_at_idx
  on private.photo_access_log (occurred_at desc);

create index if not exists photo_access_log_user_idx
  on private.photo_access_log (user_id, occurred_at desc);

create index if not exists photo_access_log_gallery_idx
  on private.photo_access_log (gallery, occurred_at desc);

alter table private.photo_access_log enable row level security;
revoke all on table private.photo_access_log from anon, authenticated;

comment on table private.photo_access_log is
  'One row per authorized request for a protected image byte stream. This records that the file was requested and served, not that a person looked at it.';

-- ---------------------------------------------------------------------------
-- Owner notification de-duplication (one notification per verified session)
-- ---------------------------------------------------------------------------

create table if not exists private.photo_access_notification (
  dedup_key    text        primary key,
  user_id      uuid        not null,
  email        text        not null,
  claimed_at   timestamptz not null default now(),
  delivered    boolean     not null default false,
  delivery_error text
);

alter table private.photo_access_notification enable row level security;
revoke all on table private.photo_access_notification from anon, authenticated;

comment on table private.photo_access_notification is
  'De-duplication ledger: at most one owner notification per verified session, claimed on the first photo request of that session.';

-- ---------------------------------------------------------------------------
-- Trigger: record successful inbox verification
-- ---------------------------------------------------------------------------

create or replace function private.log_auth_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    insert into private.auth_event_log (user_id, email, event_type)
    values (new.id, new.email, 'user_created');
  elsif (new.last_sign_in_at is distinct from old.last_sign_in_at
         and new.last_sign_in_at is not null) then
    insert into private.auth_event_log (user_id, email, event_type)
    values (new.id, new.email, 'email_verified_sign_in');
  end if;

  return new;
exception
  -- Logging must never be able to lock people out of their own inbox verification.
  when others then
    return new;
end;
$$;

revoke all on function private.log_auth_event() from public, anon, authenticated;

drop trigger if exists on_auth_user_sign_in on auth.users;

create trigger on_auth_user_sign_in
  after insert or update on auth.users
  for each row execute function private.log_auth_event();

-- ---------------------------------------------------------------------------
-- RPC: record a photo access request (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.record_photo_access(
  p_user_id    uuid,
  p_session_id uuid,
  p_gallery    text,
  p_photo_path text,
  p_event_type text default 'photo_request',
  p_outcome    text default 'allowed'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_id    bigint;
begin
  -- Identity is resolved from the database, not from the caller's payload.
  select u.email into v_email
  from auth.users u
  where u.id = p_user_id;

  if v_email is null then
    raise exception 'record_photo_access: unknown user %', p_user_id
      using errcode = 'foreign_key_violation';
  end if;

  insert into private.photo_access_log (
    user_id, email, session_id, event_type, gallery, photo_path, outcome
  )
  values (
    p_user_id, v_email, p_session_id, p_event_type, p_gallery, p_photo_path, p_outcome
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_photo_access(uuid, uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_photo_access(uuid, uuid, text, text, text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- RPC: claim the single owner notification for a verified session
-- ---------------------------------------------------------------------------

create or replace function public.claim_photo_access_notification(
  p_user_id   uuid,
  p_dedup_key text
)
returns table (should_notify boolean, email text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_rows  integer;
begin
  select u.email into v_email
  from auth.users u
  where u.id = p_user_id;

  if v_email is null then
    raise exception 'claim_photo_access_notification: unknown user %', p_user_id
      using errcode = 'foreign_key_violation';
  end if;

  insert into private.photo_access_notification (dedup_key, user_id, email)
  values (p_dedup_key, p_user_id, v_email)
  on conflict (dedup_key) do nothing;

  get diagnostics v_rows = row_count;

  return query select (v_rows = 1), v_email;
end;
$$;

revoke all on function public.claim_photo_access_notification(uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_photo_access_notification(uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- RPC: mark notification delivery outcome (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.mark_photo_access_notification(
  p_dedup_key text,
  p_delivered boolean,
  p_error     text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.photo_access_notification
  set delivered = p_delivered,
      delivery_error = p_error
  where dedup_key = p_dedup_key;
end;
$$;

revoke all on function public.mark_photo_access_notification(text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.mark_photo_access_notification(text, boolean, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Owner-only reporting views (queried from the Supabase SQL editor)
-- ---------------------------------------------------------------------------

create or replace view private.photo_access_recent as
select
  l.occurred_at,
  l.email,
  l.event_type,
  l.outcome,
  l.gallery,
  l.photo_path,
  l.session_id,
  l.user_id
from private.photo_access_log l
order by l.occurred_at desc;

create or replace view private.photo_access_by_visitor as
select
  l.email,
  count(*) filter (where l.outcome = 'allowed')            as allowed_requests,
  count(*) filter (where l.outcome <> 'allowed')           as rejected_requests,
  count(distinct l.gallery)                                as galleries_touched,
  count(distinct l.session_id)                             as verified_sessions,
  min(l.occurred_at)                                       as first_request_at,
  max(l.occurred_at)                                       as last_request_at
from private.photo_access_log l
group by l.email
order by max(l.occurred_at) desc;

create or replace view private.auth_events_recent as
select
  e.occurred_at,
  e.email,
  e.event_type,
  e.user_id
from private.auth_event_log e
order by e.occurred_at desc;

revoke all on private.photo_access_recent from anon, authenticated;
revoke all on private.photo_access_by_visitor from anon, authenticated;
revoke all on private.auth_events_recent from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'protected-photos',
  'protected-photos',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- No permissive policy is granted for this bucket, so anon/authenticated already
-- have no access. The restrictive policies below additionally guarantee that a
-- future permissive policy cannot accidentally open it up: a RESTRICTIVE policy
-- is AND-ed with every permissive policy.

drop policy if exists "protected_photos_deny_anon" on storage.objects;
create policy "protected_photos_deny_anon"
  on storage.objects
  as restrictive
  for all
  to anon
  using (bucket_id <> 'protected-photos')
  with check (bucket_id <> 'protected-photos');

drop policy if exists "protected_photos_deny_authenticated" on storage.objects;
create policy "protected_photos_deny_authenticated"
  on storage.objects
  as restrictive
  for all
  to authenticated
  using (bucket_id <> 'protected-photos')
  with check (bucket_id <> 'protected-photos');
