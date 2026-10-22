-- Run against a disposable/local Supabase database as postgres, after migrations.
-- Uses synthetic users and rolls back every change, including on assertion failure.
begin;

insert into auth.users (id, email, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'rls-owner-a@example.invalid', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'rls-owner-b@example.invalid', now(), now());

insert into public.mock_projects (id, owner_id, name, slug) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Owner A', 'rls-fixture-owner-a'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Owner B', 'rls-fixture-owner-b');

insert into public.mock_endpoints (id, project_id, method, path) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'GET', '/products'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'GET', '/products');

insert into public.request_logs (endpoint_id, method, requested_path, status_code, duration_ms) values
  ('20000000-0000-4000-8000-000000000001', 'GET', '/products', 200, 1),
  ('20000000-0000-4000-8000-000000000002', 'GET', '/products', 200, 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

do $$
declare affected integer;
begin
  if (select count(*) from public.mock_projects) <> 1 then
    raise exception 'RLS failed: project visibility';
  end if;
  if (select count(*) from public.mock_endpoints) <> 1 then
    raise exception 'RLS failed: endpoint visibility';
  end if;
  if (select count(*) from public.request_logs) <> 1 then
    raise exception 'RLS failed: log visibility';
  end if;

  update public.mock_projects set name = 'Owner A updated'
    where id = '10000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner update should succeed'; end if;

  update public.mock_projects set name = 'Cross-user update'
    where id = '10000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS failed: cross-user update'; end if;

  delete from public.mock_endpoints
    where id = '20000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS failed: cross-user delete'; end if;

  begin
    insert into public.mock_projects (owner_id, name, slug)
      values ('00000000-0000-4000-8000-000000000002', 'Forged owner', 'rls-forged-owner');
    raise exception 'RLS failed: client-supplied owner accepted';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.mock_endpoints (project_id, method, path)
      values ('10000000-0000-4000-8000-000000000002', 'POST', '/unauthorized');
    raise exception 'RLS failed: endpoint added to another user project';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.mock_endpoints set project_id = '10000000-0000-4000-8000-000000000002'
      where id = '20000000-0000-4000-8000-000000000001';
    raise exception 'RLS failed: endpoint transferred to another user';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.request_logs (endpoint_id, method, requested_path, status_code, duration_ms)
      values ('20000000-0000-4000-8000-000000000001', 'GET', '/products', 200, 1);
    raise exception 'Privileges failed: browser inserted a log';
  exception when insufficient_privilege then null;
  end;

  if has_table_privilege(current_user, 'public.mock_projects', 'TRUNCATE')
    or has_table_privilege(current_user, 'public.mock_endpoints', 'TRUNCATE')
    or has_table_privilege(current_user, 'public.request_logs', 'TRUNCATE') then
    raise exception 'Privileges failed: browser role can truncate';
  end if;
end;
$$;

-- Repeat visibility with a separate identity.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $$
begin
  if (select count(*) from public.mock_projects) <> 1
    or exists (select 1 from public.mock_projects where owner_id <> auth.uid()) then
    raise exception 'RLS failed: second user project visibility';
  end if;
  if (select count(*) from public.mock_endpoints) <> 1
    or (select count(*) from public.request_logs) <> 1 then
    raise exception 'RLS failed: second user endpoint/log visibility';
  end if;

  delete from public.mock_projects where id = '10000000-0000-4000-8000-000000000002';
  if exists (select 1 from public.mock_endpoints) or exists (select 1 from public.request_logs) then
    raise exception 'Cascade failed: endpoint/log remains after project deletion';
  end if;
end;
$$;

reset role;
set local role anon;
do $$
begin
  if has_table_privilege(current_user, 'public.mock_projects', 'SELECT')
    or has_table_privilege(current_user, 'public.mock_endpoints', 'SELECT')
    or has_table_privilege(current_user, 'public.request_logs', 'SELECT') then
    raise exception 'Privileges failed: anonymous management access';
  end if;
end;
$$;

reset role;
rollback;
