create extension if not exists pgcrypto;

create table public.mock_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (
    char_length(slug) between 3 and 63
    and slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  description text check (description is null or char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mock_endpoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.mock_projects (id) on delete cascade,
  method text not null check (method in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  path text not null check (
    char_length(path) between 1 and 200
    and path like '/%'
    and path not like '%?%'
    and path not like '%#%'
  ),
  status_code smallint not null default 200 check (status_code between 100 and 599),
  response_body jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_endpoints_project_method_path_key unique (project_id, method, path)
);

create table public.request_logs (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.mock_endpoints (id) on delete cascade,
  method text not null check (char_length(method) between 3 and 10),
  requested_path text not null check (char_length(requested_path) between 1 and 500),
  query_params jsonb not null default '{}'::jsonb check (
    jsonb_typeof(query_params) = 'object'
    and pg_column_size(query_params) <= 8192
  ),
  status_code smallint not null check (status_code between 100 and 599),
  duration_ms integer not null check (duration_ms between 0 and 3600000),
  created_at timestamptz not null default now()
);

create index mock_projects_owner_id_idx
  on public.mock_projects (owner_id);

create index mock_endpoints_project_id_idx
  on public.mock_endpoints (project_id);

create index mock_endpoints_runtime_lookup_idx
  on public.mock_endpoints (project_id, method, path)
  where is_active = true;

create index request_logs_endpoint_created_at_idx
  on public.request_logs (endpoint_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_mock_projects_updated_at
before update on public.mock_projects
for each row execute function public.set_updated_at();

create trigger set_mock_endpoints_updated_at
before update on public.mock_endpoints
for each row execute function public.set_updated_at();

alter table public.mock_projects enable row level security;
alter table public.mock_endpoints enable row level security;
alter table public.request_logs enable row level security;

create policy "Owners can read their projects"
on public.mock_projects for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Owners can create projects"
on public.mock_projects for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Owners can update their projects"
on public.mock_projects for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Owners can delete their projects"
on public.mock_projects for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Owners can read their endpoints"
on public.mock_endpoints for select
to authenticated
using (
  exists (
    select 1
    from public.mock_projects
    where mock_projects.id = mock_endpoints.project_id
      and mock_projects.owner_id = (select auth.uid())
  )
);

create policy "Owners can create endpoints"
on public.mock_endpoints for insert
to authenticated
with check (
  exists (
    select 1
    from public.mock_projects
    where mock_projects.id = mock_endpoints.project_id
      and mock_projects.owner_id = (select auth.uid())
  )
);

create policy "Owners can update their endpoints"
on public.mock_endpoints for update
to authenticated
using (
  exists (
    select 1
    from public.mock_projects
    where mock_projects.id = mock_endpoints.project_id
      and mock_projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.mock_projects
    where mock_projects.id = mock_endpoints.project_id
      and mock_projects.owner_id = (select auth.uid())
  )
);

create policy "Owners can delete their endpoints"
on public.mock_endpoints for delete
to authenticated
using (
  exists (
    select 1
    from public.mock_projects
    where mock_projects.id = mock_endpoints.project_id
      and mock_projects.owner_id = (select auth.uid())
  )
);

create policy "Owners can read endpoint request logs"
on public.request_logs for select
to authenticated
using (
  exists (
    select 1
    from public.mock_endpoints
    join public.mock_projects
      on mock_projects.id = mock_endpoints.project_id
    where mock_endpoints.id = request_logs.endpoint_id
      and mock_projects.owner_id = (select auth.uid())
  )
);

-- Request logs are written only by the server-side service-role client. The
-- service role bypasses RLS; no public or authenticated insert policy exists.
revoke insert, update, delete on public.request_logs from anon, authenticated;

comment on table public.mock_projects is
  'User-owned containers for mock endpoints. Deleting a project cascades to endpoints and logs.';
comment on table public.mock_endpoints is
  'Exact method-and-path response configurations. Deleting an endpoint cascades to its logs.';
comment on table public.request_logs is
  'Minimal request metadata; secrets, cookies, authorization headers, and bodies are never stored.';
