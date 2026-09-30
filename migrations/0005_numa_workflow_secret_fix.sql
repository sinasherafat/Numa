-- The workflow verifier deliberately has an empty search_path. Qualify the
-- pgcrypto functions so verification works without weakening that boundary.
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
      and sha256 = extensions.encode(
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
