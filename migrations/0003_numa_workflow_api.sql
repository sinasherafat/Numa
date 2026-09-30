-- Narrow, secret-authenticated persistence surface for Vercel Workflow steps.
-- The secret itself lives only in the branch-scoped Vercel environment; the
-- database stores a SHA-256 digest.

alter table numa.jobs add column result jsonb;

create table numa.runtime_secrets (
  name text primary key,
  sha256 text not null check (length(sha256) = 64),
  created_at timestamptz not null default now()
);
revoke all on table numa.runtime_secrets from public, anon, authenticated;

insert into numa.runtime_secrets (name, sha256)
values ('workflow', '81911e9cfa6e219178446a381e3b9379d912e41f4e0ce362119a49747a3861c3');

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
      and sha256 = encode(digest(coalesce(p_secret, ''), 'sha256'), 'hex')
  ) then
    raise insufficient_privilege using message = 'Invalid workflow credential';
  end if;
end;
$$;

create or replace function numa.workflow_claim(p_secret text, p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job numa.jobs%rowtype;
begin
  perform numa.assert_workflow_secret(p_secret);

  select * into v_job from numa.jobs where id = p_job_id for update;
  if not found then raise no_data_found using message = 'Job not found'; end if;
  if v_job.state = 'succeeded' then return to_jsonb(v_job); end if;
  if v_job.state in ('cancel_requested', 'cancelled') then
    update numa.jobs set state = 'cancelled', updated_at = now() where id = p_job_id returning * into v_job;
    return to_jsonb(v_job);
  end if;
  if v_job.attempts >= 3 then
    update numa.jobs set state = 'failed', error_code = 'RETRY_LIMIT', updated_at = now() where id = p_job_id returning * into v_job;
    return to_jsonb(v_job);
  end if;

  update numa.jobs
  set state = 'running', attempts = attempts + 1, checkpoint = 'extracting', error_code = null, updated_at = now()
  where id = p_job_id
  returning * into v_job;
  return to_jsonb(v_job);
end;
$$;

create or replace function numa.workflow_checkpoint(
  p_secret text,
  p_job_id uuid,
  p_checkpoint text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform numa.assert_workflow_secret(p_secret);
  update numa.jobs
  set checkpoint = p_checkpoint, updated_at = now()
  where id = p_job_id and state = 'running';
  if not found then raise no_data_found using message = 'Runnable job not found'; end if;
end;
$$;

create or replace function numa.workflow_complete_source(
  p_secret text,
  p_job_id uuid,
  p_pages jsonb,
  p_plan jsonb,
  p_audio_key text,
  p_duration_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job numa.jobs%rowtype;
  v_owner uuid;
  v_version uuid;
  v_source uuid;
  v_title text;
  v_snapshot uuid;
  v_topic uuid;
  v_session uuid;
  v_revision uuid;
  v_chapter uuid;
  v_page jsonb;
  v_result jsonb;
begin
  perform numa.assert_workflow_secret(p_secret);
  select * into v_job from numa.jobs where id = p_job_id for update;
  if not found then raise no_data_found using message = 'Job not found'; end if;
  if v_job.state = 'succeeded' then return v_job.result; end if;
  if v_job.state <> 'running' then raise check_violation using message = 'Job is not running'; end if;

  v_owner := v_job.owner_id;
  v_version := v_job.input_version::uuid;
  select sv.source_id, s.title into v_source, v_title
  from numa.source_versions sv join numa.sources s on s.id = sv.source_id
  where sv.id = v_version and sv.owner_id = v_owner;
  if not found then raise no_data_found using message = 'Source version not found'; end if;

  delete from numa.source_chunks where source_version_id = v_version;
  for v_page in select value from jsonb_array_elements(p_pages)
  loop
    insert into numa.source_chunks (
      source_version_id, owner_id, page_index, text, start_offset, end_offset
    ) values (
      v_version,
      v_owner,
      greatest(0, coalesce((v_page->>'page')::integer, 1) - 1),
      coalesce(v_page->>'text', ''),
      0,
      length(coalesce(v_page->>'text', ''))
    );
  end loop;

  update numa.source_versions
  set status = 'ready',
      extracted_word_count = cardinality(regexp_split_to_array(trim(coalesce((select string_agg(value->>'text', ' ') from jsonb_array_elements(p_pages)), '')), '\\s+')),
      parser_version = 'unpdf-1.8.1'
  where id = v_version and owner_id = v_owner;

  insert into numa.topics (owner_id, title, question)
  values (v_owner, coalesce(p_plan->>'title', v_title), p_plan->>'question')
  returning id into v_topic;
  insert into numa.source_snapshots (owner_id, topic_id, version_ids)
  values (v_owner, v_topic, array[v_version]) returning id into v_snapshot;
  insert into numa.sessions (owner_id, topic_id, goal_type, goal_details, level, duration_target, state)
  values (
    v_owner,
    v_topic,
    coalesce(p_plan->>'goal', 'understand'),
    jsonb_build_object('question', p_plan->>'question'),
    coalesce(p_plan->>'level', 'familiar'),
    coalesce((p_plan->>'duration')::integer, 5),
    'available'
  ) returning id into v_session;
  insert into numa.session_revisions (owner_id, session_id, sequence, source_snapshot_id, reason, state)
  values (v_owner, v_session, 1, v_snapshot, 'initial_generation', 'complete') returning id into v_revision;
  insert into numa.chapters (owner_id, created_in_revision_id, objective, script, audio_key, duration_ms, status)
  values (
    v_owner,
    v_revision,
    coalesce(p_plan->>'objective', 'Understand the source'),
    p_plan,
    p_audio_key,
    p_duration_ms,
    'ready'
  ) returning id into v_chapter;
  insert into numa.revision_chapters (owner_id, revision_id, chapter_id, position)
  values (v_owner, v_revision, v_chapter, 0);
  update numa.sessions set active_revision_id = v_revision where id = v_session;

  insert into numa.outcomes (owner_id, session_id, revision_id, type, content, source_snapshot_id, status)
  values
    (v_owner, v_session, v_revision, 'notes', coalesce(p_plan->'notes', '[]'::jsonb), v_snapshot, 'ready'),
    (v_owner, v_session, v_revision, 'flashcards', coalesce(p_plan->'flashcards', '[]'::jsonb), v_snapshot, 'ready'),
    (v_owner, v_session, v_revision, 'slide_outline', coalesce(p_plan->'outline', '[]'::jsonb), v_snapshot, 'ready');

  v_result := jsonb_build_object(
    'source_id', v_source,
    'source_version_id', v_version,
    'session_id', v_session,
    'revision_id', v_revision,
    'chapter_id', v_chapter
  );
  update numa.jobs
  set state = 'succeeded', checkpoint = 'complete', result = v_result, updated_at = now()
  where id = p_job_id;
  return v_result;
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
begin
  perform numa.assert_workflow_secret(p_secret);
  update numa.jobs
  set state = case when p_retryable and attempts < 3 then 'retry_wait' else 'failed' end,
      error_code = left(coalesce(p_error_code, 'UNKNOWN'), 80),
      available_at = case when p_retryable and attempts < 3 then now() + interval '30 seconds' else available_at end,
      updated_at = now()
  where id = p_job_id and state not in ('succeeded', 'cancelled');
end;
$$;

revoke all on function numa.assert_workflow_secret(text) from public, anon, authenticated;
revoke all on function numa.workflow_claim(text, uuid) from public;
revoke all on function numa.workflow_checkpoint(text, uuid, text) from public;
revoke all on function numa.workflow_complete_source(text, uuid, jsonb, jsonb, text, integer) from public;
revoke all on function numa.workflow_fail(text, uuid, text, boolean) from public;
grant usage on schema numa to anon;
grant execute on function numa.workflow_claim(text, uuid) to anon, authenticated;
grant execute on function numa.workflow_checkpoint(text, uuid, text) to anon, authenticated;
grant execute on function numa.workflow_complete_source(text, uuid, jsonb, jsonb, text, integer) to anon, authenticated;
grant execute on function numa.workflow_fail(text, uuid, text, boolean) to anon, authenticated;
notify pgrst, 'reload schema';
