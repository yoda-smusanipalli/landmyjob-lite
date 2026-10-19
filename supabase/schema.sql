-- LandMyJob Lite schema. Run once in the Supabase SQL editor.
-- Every row belongs to one user; row-level security keeps users to their own data.

create table if not exists public.resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 120),
  raw_text    text not null check (char_length(raw_text) between 1 and 60000),
  created_at  timestamptz not null default now()
);

create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 160),
  company     text not null default '' check (char_length(company) <= 160),
  raw_text    text not null check (char_length(raw_text) between 1 and 60000),
  stage       text not null default 'saved'
              check (stage in ('saved', 'applied', 'interviewing', 'offer', 'rejected')),
  created_at  timestamptz not null default now()
);

create index if not exists resumes_user_idx on public.resumes (user_id, created_at desc);
create index if not exists jobs_user_idx on public.jobs (user_id, created_at desc);

alter table public.resumes enable row level security;
alter table public.jobs enable row level security;

drop policy if exists "own resumes" on public.resumes;
create policy "own resumes" on public.resumes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own jobs" on public.jobs;
create policy "own jobs" on public.jobs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
