-- Persist generated dialogue as timed transcript spans and expose an audio
-- outcome record. Existing rows are left untouched; this trigger applies to
-- newly completed Preview workflows.

create or replace function numa.persist_chapter_transcript()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_line record;
  v_start integer;
  v_end integer;
  v_citation uuid;
begin
  if new.status <> 'ready' or jsonb_typeof(new.script->'dialogue') <> 'array' then
    return new;
  end if;
  v_count := jsonb_array_length(new.script->'dialogue');
  if v_count < 1 then return new; end if;

  for v_line in
    select value, ordinality::integer as position
    from jsonb_array_elements(new.script->'dialogue') with ordinality
  loop
    v_start := floor((v_line.position - 1) * new.duration_ms::numeric / v_count)::integer;
    v_end := floor(v_line.position * new.duration_ms::numeric / v_count)::integer;
    select sc.id into v_citation
    from numa.source_chunks sc
    join numa.session_revisions sr on sr.id = new.created_in_revision_id
    join numa.source_snapshots ss on ss.id = sr.source_snapshot_id
    where sc.owner_id = new.owner_id
      and sc.source_version_id = any(ss.version_ids)
      and sc.page_index = greatest(0, coalesce((v_line.value->>'page')::integer, 1) - 1)
    order by sc.start_offset
    limit 1;
    insert into numa.transcript_spans(owner_id, chapter_id, speaker, text, start_ms, end_ms, citation_ids)
    values (
      new.owner_id,
      new.id,
      coalesce(v_line.value->>'speaker', 'host_a'),
      coalesce(v_line.value->>'text', ''),
      v_start,
      greatest(v_start, v_end),
      case when v_citation is null then '{}'::uuid[] else array[v_citation] end
    );
  end loop;
  return new;
end;
$$;

revoke all on function numa.persist_chapter_transcript() from public, anon, authenticated;
create trigger chapters_persist_transcript
after insert on numa.chapters
for each row execute function numa.persist_chapter_transcript();

create or replace function numa.persist_audio_outcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_session uuid; v_snapshot uuid;
begin
  if new.status <> 'ready' or new.audio_key is null then return new; end if;
  select session_id, source_snapshot_id into v_session, v_snapshot
  from numa.session_revisions where id = new.created_in_revision_id and owner_id = new.owner_id;
  if v_session is not null then
    insert into numa.outcomes(owner_id, session_id, revision_id, type, content, source_snapshot_id, status)
    values (new.owner_id, v_session, new.created_in_revision_id, 'audio',
      jsonb_build_object('chapter_id', new.id, 'duration_ms', new.duration_ms), v_snapshot, 'ready');
  end if;
  return new;
end;
$$;

revoke all on function numa.persist_audio_outcome() from public, anon, authenticated;
create trigger chapters_persist_audio_outcome
after insert on numa.chapters
for each row execute function numa.persist_audio_outcome();
