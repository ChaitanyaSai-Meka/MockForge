-- PostgREST maps a JSON null property to SQL NULL when writing a row.
-- Convert it to the JSONB null value before the NOT NULL constraint is checked,
-- so a configured response of `null` round-trips through the standard client.
create or replace function public.preserve_json_null_response()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.response_body = coalesce(new.response_body, 'null'::jsonb);
  return new;
end;
$$;

create trigger preserve_mock_endpoint_json_null
before insert or update of response_body on public.mock_endpoints
for each row execute function public.preserve_json_null_response();

-- Match the canonical exact paths accepted by the application. Existing paths
-- must be corrected first if they contain trailing/repeated slashes, dot
-- segments, whitespace, encoded characters, or dynamic route syntax.
alter table public.mock_endpoints
  add constraint mock_endpoints_canonical_path_check check (
    (path = '/' or path ~ '^/([A-Za-z0-9._~-]+/)*[A-Za-z0-9._~-]+$')
    and path !~ '(^|/)\.{1,2}(/|$)'
  );
