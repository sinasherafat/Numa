-- Blob completion callbacks cannot carry a browser session. They use the
-- short-lived, signed Blob token payload plus the server-only workflow secret
-- to create exactly one owner-scoped ingestion job.

create or replace function numa.workflow_create_source_job(
  p_secret text,
  p_owner_id uuid,
  p_title text,
  p_content_hash text,
  p_file_key text,
  p_idempotency_key text,
  p_input jsonb,
  p_status text default 'processing',
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source uuid;
  v_version uuid;
  v_job numa.jobs%rowtype;
begin
  perform numa.assert_workflow_secret(p_secret);
  if not exists (select 1 from numa.users where id = p_owner_id) then
    raise no_data_found using message = 'Owner not found';
  end if;
  if p_status not in ('processing', 'unsupported', 'failed') then
    raise check_violation using message = 'Invalid source status';
  end if;

  select * into v_job
  from numa.jobs
  where owner_id = p_owner_id
    and type = 'source_ingest'
    and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'job_id', v_job.id,
      'source_version_id', v_job.input_version,
      'state', v_job.state,
      'duplicate', true
    );
  end if;

  select sv.source_id, sv.id into v_source, v_version
  from numa.source_versions sv
  join numa.sources s on s.id = sv.source_id
  where sv.owner_id = p_owner_id
    and sv.content_hash = p_content_hash
    and s.deleted_at is null;
  if found then
    select * into v_job
    from numa.jobs
    where owner_id = p_owner_id
      and type = 'source_ingest'
      and input_version = v_version::text
    order by created_at desc
    limit 1;
    return jsonb_build_object(
      'job_id', v_job.id,
      'source_id', v_source,
      'source_version_id', v_version,
      'state', coalesce(v_job.state, 'succeeded'),
      'duplicate', true
    );
  end if;

  insert into numa.sources (owner_id, title, origin_type)
  values (p_owner_id, left(trim(p_title), 300), 'upload')
  returning id into v_source;

  insert into numa.source_versions (
    source_id, owner_id, content_hash, version_no, file_key, status
  ) values (
    v_source, p_owner_id, p_content_hash, 1, p_file_key, p_status
  ) returning id into v_version;

  insert into numa.jobs (
    owner_id, type, input_version, idempotency_key, state, checkpoint,
    error_code, result
  ) values (
    p_owner_id,
    'source_ingest',
    v_version::text,
    p_idempotency_key,
    case when p_status = 'processing' then 'queued' else 'failed' end,
    case when p_status = 'processing' then 'uploaded' else 'validation_failed' end,
    p_error_code,
    jsonb_build_object('input', p_input, 'source_id', v_source)
  ) returning * into v_job;

  return jsonb_build_object(
    'job_id', v_job.id,
    'source_id', v_source,
    'source_version_id', v_version,
    'state', v_job.state,
    'duplicate', false
  );
end;
$$;

create or replace function numa.workflow_attach_run(
  p_secret text,
  p_job_id uuid,
  p_run_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform numa.assert_workflow_secret(p_secret);
  update numa.jobs
  set workflow_run_id = p_run_id, updated_at = now()
  where id = p_job_id and state in ('queued', 'running', 'retry_wait');
  if not found then raise no_data_found using message = 'Attachable job not found'; end if;
end;
$$;

create or replace function numa.workflow_fail(
  p_secret text,
  p_job_id uuid,
  p_error_code text,
  p_retryable boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job numa.jobs%rowtype;
begin
  perform numa.assert_workflow_secret(p_secret);
  update numa.jobs
  set state = case when p_retryable and attempts < 3 then 'retry_wait' else 'failed' end,
      error_code = left(coalesce(p_error_code, 'UNKNOWN'), 80),
      available_at = case when p_retryable and attempts < 3 then now() + interval '30 seconds' else available_at end,
      updated_at = now()
  where id = p_job_id and state not in ('succeeded', 'cancelled')
  returning * into v_job;

  if found and v_job.type = 'source_ingest' and v_job.state = 'failed' then
    update numa.source_versions
    set status = 'failed'
    where id = v_job.input_version::uuid and owner_id = v_job.owner_id;
  end if;
end;
$$;

revoke all on function numa.workflow_create_source_job(text, uuid, text, text, text, text, jsonb, text, text) from public;
revoke all on function numa.workflow_attach_run(text, uuid, text) from public;
revoke all on function numa.workflow_fail(text, uuid, text, boolean) from public;
grant execute on function numa.workflow_create_source_job(text, uuid, text, text, text, text, jsonb, text, text) to anon, authenticated;
grant execute on function numa.workflow_attach_run(text, uuid, text) to anon, authenticated;
grant execute on function numa.workflow_fail(text, uuid, text, boolean) to anon, authenticated;
notify pgrst, 'reload schema';
