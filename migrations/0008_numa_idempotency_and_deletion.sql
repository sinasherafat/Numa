-- Close the callback retry window: return the canonical blob/run metadata and
-- let only the first workflow invocation claim a queued job.

create or replace function numa.workflow_create_source_job(
  p_secret text, p_owner_id uuid, p_title text, p_content_hash text,
  p_file_key text, p_idempotency_key text, p_input jsonb,
  p_status text default 'processing', p_error_code text default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_source uuid; v_version uuid; v_file_key text; v_job numa.jobs%rowtype;
begin
  perform numa.assert_workflow_secret(p_secret);
  if not exists (select 1 from numa.users where id = p_owner_id) then
    raise no_data_found using message = 'Owner not found';
  end if;
  if p_status not in ('processing', 'unsupported', 'failed') then
    raise check_violation using message = 'Invalid source status';
  end if;

  select * into v_job from numa.jobs
  where owner_id = p_owner_id and type = 'source_ingest' and idempotency_key = p_idempotency_key;
  if found then
    select file_key into v_file_key from numa.source_versions where id = v_job.input_version::uuid;
    return jsonb_build_object('job_id', v_job.id, 'source_version_id', v_job.input_version,
      'state', v_job.state, 'duplicate', true, 'file_key', v_file_key,
      'workflow_run_id', v_job.workflow_run_id);
  end if;

  select sv.source_id, sv.id, sv.file_key into v_source, v_version, v_file_key
  from numa.source_versions sv join numa.sources s on s.id = sv.source_id
  where sv.owner_id = p_owner_id and sv.content_hash = p_content_hash and s.deleted_at is null;
  if found then
    select * into v_job from numa.jobs
    where owner_id = p_owner_id and type = 'source_ingest' and input_version = v_version::text
    order by created_at desc limit 1;
    return jsonb_build_object('job_id', v_job.id, 'source_id', v_source,
      'source_version_id', v_version, 'state', coalesce(v_job.state, 'succeeded'),
      'duplicate', true, 'file_key', v_file_key, 'workflow_run_id', v_job.workflow_run_id);
  end if;

  insert into numa.sources (owner_id, title, origin_type)
  values (p_owner_id, left(trim(p_title), 300), 'upload') returning id into v_source;
  insert into numa.source_versions (source_id, owner_id, content_hash, version_no, file_key, status)
  values (v_source, p_owner_id, p_content_hash, 1, p_file_key, p_status) returning id into v_version;
  insert into numa.jobs (owner_id, type, input_version, idempotency_key, state, checkpoint, error_code, result)
  values (p_owner_id, 'source_ingest', v_version::text, p_idempotency_key,
    case when p_status = 'processing' then 'queued' else 'failed' end,
    case when p_status = 'processing' then 'uploaded' else 'validation_failed' end,
    p_error_code, jsonb_build_object('input', p_input, 'source_id', v_source))
  returning * into v_job;
  return jsonb_build_object('job_id', v_job.id, 'source_id', v_source,
    'source_version_id', v_version, 'state', v_job.state, 'duplicate', false,
    'file_key', p_file_key, 'workflow_run_id', null);
end;
$$;

create or replace function numa.workflow_claim(p_secret text, p_job_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_job numa.jobs%rowtype;
begin
  perform numa.assert_workflow_secret(p_secret);
  select * into v_job from numa.jobs where id = p_job_id for update;
  if not found then raise no_data_found using message = 'Job not found'; end if;
  if v_job.state in ('succeeded', 'running') then
    return to_jsonb(v_job) || jsonb_build_object('_claimed', false);
  end if;
  if v_job.state in ('cancel_requested', 'cancelled') then
    update numa.jobs set state = 'cancelled', updated_at = now() where id = p_job_id returning * into v_job;
    return to_jsonb(v_job) || jsonb_build_object('_claimed', false);
  end if;
  if v_job.attempts >= 3 then
    update numa.jobs set state = 'failed', error_code = 'RETRY_LIMIT', updated_at = now() where id = p_job_id returning * into v_job;
    return to_jsonb(v_job) || jsonb_build_object('_claimed', false);
  end if;
  update numa.jobs set state = 'running', attempts = attempts + 1,
    checkpoint = 'extracting', error_code = null, updated_at = now()
  where id = p_job_id and state in ('queued', 'retry_wait') returning * into v_job;
  if not found then
    select * into v_job from numa.jobs where id = p_job_id;
    return to_jsonb(v_job) || jsonb_build_object('_claimed', false);
  end if;
  return to_jsonb(v_job) || jsonb_build_object('_claimed', true);
end;
$$;

create or replace function numa.delete_owned_source(p_source_id uuid)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_owner uuid := (select auth.uid()); v_topic_ids uuid[]; v_snapshot_ids uuid[];
begin
  if v_owner is null then raise insufficient_privilege using message = 'Authentication required'; end if;
  if not exists (select 1 from numa.sources where id = p_source_id and owner_id = v_owner) then return false; end if;
  update numa.source_versions set status = 'deleting' where source_id = p_source_id and owner_id = v_owner;
  update numa.jobs set state = 'cancel_requested', updated_at = now()
    where owner_id = v_owner and input_version in (select id::text from numa.source_versions where source_id = p_source_id)
      and state in ('queued', 'running', 'retry_wait');
  select array_agg(distinct topic_id), array_agg(id) into v_topic_ids, v_snapshot_ids
    from numa.source_snapshots where owner_id = v_owner
      and version_ids && array(select id from numa.source_versions where source_id = p_source_id);
  delete from numa.change_sets where owner_id = v_owner and (baseline_id in
    (select id from numa.review_checkpoints where snapshot_id = any(coalesce(v_snapshot_ids, '{}'::uuid[])))
    or new_snapshot_id = any(coalesce(v_snapshot_ids, '{}'::uuid[])));
  delete from numa.review_checkpoints where owner_id = v_owner and snapshot_id = any(coalesce(v_snapshot_ids, '{}'::uuid[]));
  delete from numa.sessions where owner_id = v_owner and id in
    (select session_id from numa.session_revisions where source_snapshot_id = any(coalesce(v_snapshot_ids, '{}'::uuid[])));
  delete from numa.source_snapshots where owner_id = v_owner and id = any(coalesce(v_snapshot_ids, '{}'::uuid[]));
  delete from numa.sources where id = p_source_id and owner_id = v_owner;
  delete from numa.topics where owner_id = v_owner and id = any(coalesce(v_topic_ids, '{}'::uuid[]))
    and not exists (select 1 from numa.source_snapshots where topic_id = numa.topics.id);
  return true;
end;
$$;

revoke all on function numa.delete_owned_source(uuid) from public, anon;
grant execute on function numa.delete_owned_source(uuid) to authenticated;
notify pgrst, 'reload schema';
