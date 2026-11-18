create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  payload jsonb not null,
  is_public boolean not null default false,
  share_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.roadmaps
  add column if not exists is_public boolean not null default false,
  add column if not exists share_token text;

create unique index if not exists roadmaps_share_token_idx
  on public.roadmaps (share_token)
  where share_token is not null;

create index if not exists roadmaps_user_updated_idx
  on public.roadmaps (user_id, updated_at desc);

alter table public.roadmaps enable row level security;

drop policy if exists "Users can view their own roadmaps" on public.roadmaps;
drop policy if exists "Users can view their own or public roadmaps" on public.roadmaps;

create policy "Users can view their own or public roadmaps"
  on public.roadmaps
  for select
  using (is_public or (select auth.uid()) = user_id);

drop policy if exists "Users can insert their own roadmaps" on public.roadmaps;
drop policy if exists "Users can update their own roadmaps" on public.roadmaps;
drop policy if exists "Users can delete their own roadmaps" on public.roadmaps;

create policy "Users can insert their own roadmaps"
  on public.roadmaps
  for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own roadmaps"
  on public.roadmaps
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own roadmaps"
  on public.roadmaps
  for delete
  using ((select auth.uid()) = user_id);

create or replace function public.set_roadmap_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists roadmaps_set_updated_at on public.roadmaps;

create trigger roadmaps_set_updated_at
before update on public.roadmaps
for each row
execute function public.set_roadmap_updated_at();
