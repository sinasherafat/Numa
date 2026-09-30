-- encode is a PostgreSQL built-in in pg_catalog, while digest is installed in
-- the extensions schema on hosted Supabase.
create or replace function numa.assert_workflow_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from numa.runtime_secrets
    where name = 'workflow'
      and sha256 = pg_catalog.encode(
        extensions.digest(coalesce(p_secret, ''), 'sha256'),
        'hex'
      )
  ) then
    raise insufficient_privilege using message = 'Invalid workflow credential';
  end if;
end;
$$;

revoke all on function numa.assert_workflow_secret(text)
  from public, anon, authenticated;
