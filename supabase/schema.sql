create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmaps_user_updated_idx
  on public.roadmaps (user_id, updated_at desc);

alter table public.roadmaps enable row level security;

create policy "Users can view their own roadmaps"
  on public.roadmaps
  for select
  using ((select auth.uid()) = user_id);

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

create or replace trigger roadmaps_set_updated_at
before update on public.roadmaps
for each row
execute function public.set_roadmap_updated_at();
