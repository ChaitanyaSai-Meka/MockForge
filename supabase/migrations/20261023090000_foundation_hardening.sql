-- Explicit privileges make access independent of the project's default grants.
-- RLS does not protect TRUNCATE, so browser-facing roles must never receive it.
revoke all on public.mock_projects, public.mock_endpoints, public.request_logs
  from public, anon, authenticated;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.mock_projects, public.mock_endpoints
  to authenticated;
grant select on public.request_logs to authenticated;
grant all on public.mock_projects, public.mock_endpoints, public.request_logs
  to service_role;

alter table public.mock_projects
  add constraint mock_projects_name_not_blank check (char_length(btrim(name)) > 0);

-- Fetch/Next.js cannot construct a final Response with a 1xx status.
alter table public.mock_endpoints
  drop constraint mock_endpoints_status_code_check,
  add constraint mock_endpoints_status_code_check check (status_code between 200 and 599),
  add constraint mock_endpoints_response_body_size_check
    check (octet_length(response_body::text) <= 65536);

comment on column public.mock_endpoints.response_body is
  'Valid JSON, limited to 64 KiB of JSONB text. Runtime must omit the body for 204, 205, and 304 responses.';
