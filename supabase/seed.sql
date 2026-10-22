-- Optional demo data. Run manually AFTER creating a test Auth user.
-- Do not reset the database to run this script: reset also removes Auth users.
-- This script never creates credentials and never modifies existing projects.
do $$
declare
  demo_owner uuid;
  demo_project uuid;
begin
  select id
  into demo_owner
  from auth.users
  order by created_at asc
  limit 1;

  if demo_owner is null then
    raise notice 'MockForge seed skipped: create a local Auth user first.';
    return;
  end if;

  insert into public.mock_projects (owner_id, name, slug, description)
  values (
    demo_owner,
    'Storefront Demo',
    'mockforge-demo',
    'Local sample data for exploring the MockForge dashboard.'
  )
  on conflict (slug) do nothing
  returning id into demo_project;

  if demo_project is null then
    raise notice 'MockForge demo project already exists; existing data was left unchanged.';
    return;
  end if;

  insert into public.mock_endpoints (
    project_id,
    method,
    path,
    status_code,
    response_body,
    is_active
  )
  values (
    demo_project,
    'GET',
    '/products',
    200,
    '{"products":[{"id":1,"name":"Mechanical Keyboard","price":129}]}'::jsonb,
    true
  )
  on conflict (project_id, method, path) do nothing;
end;
$$;
