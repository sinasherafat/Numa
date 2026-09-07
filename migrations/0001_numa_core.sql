-- Numa v1 core schema. Run explicitly against an isolated Preview database.
-- This migration is never executed by the frontend build.

create extension if not exists pgcrypto;
create schema if not exists numa;
revoke all on schema numa from public;

create table numa.users (
  id uuid primary key default gen_random_uuid(),
  external_subject text not null unique,
  email text,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table numa.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references numa.users(id) on delete cascade,
  type text not null check (type in ('learning_memory', 'raw_audio_retention')),
  enabled boolean not null,
  policy_version text not null,
  retention_choice text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type, policy_version)
);
create index consents_user_id_idx on numa.consents(user_id);

create table numa.sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  title text not null,
  origin_type text not null check (origin_type in ('upload', 'public_url')),
  original_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index sources_owner_active_idx on numa.sources(owner_id, created_at desc) where deleted_at is null;

create table numa.source_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references numa.sources(id) on delete cascade,
  owner_id uuid not null references numa.users(id) on delete cascade,
  content_hash text not null,
  version_no integer not null check (version_no > 0),
  file_key text not null,
  status text not null check (status in ('uploading', 'processing', 'ready', 'unsupported', 'failed', 'deleting', 'deleted')),
  published_at timestamptz,
  added_at timestamptz not null default now(),
  extracted_word_count integer check (extracted_word_count is null or extracted_word_count >= 0),
  parser_version text,
  created_at timestamptz not null default now(),
  unique (source_id, version_no),
  unique (owner_id, content_hash)
);
create index source_versions_source_id_idx on numa.source_versions(source_id);
create index source_versions_owner_status_idx on numa.source_versions(owner_id, status, added_at desc);

create table numa.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references numa.source_versions(id) on delete cascade,
  owner_id uuid not null references numa.users(id) on delete cascade,
  page_index integer not null check (page_index >= 0),
  text text not null,
  start_offset integer not null check (start_offset >= 0),
  end_offset integer not null check (end_offset >= start_offset),
  bbox jsonb,
  section_path text[],
  created_at timestamptz not null default now()
);
create index source_chunks_source_page_idx on numa.source_chunks(source_version_id, page_index, start_offset);
create index source_chunks_owner_id_idx on numa.source_chunks(owner_id);

create table numa.topics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  title text not null,
  question text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index topics_owner_id_idx on numa.topics(owner_id, updated_at desc);

create table numa.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  topic_id uuid references numa.topics(id) on delete set null,
  version_ids uuid[] not null check (cardinality(version_ids) between 1 and 5),
  page_selections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index source_snapshots_owner_id_idx on numa.source_snapshots(owner_id, created_at desc);
create index source_snapshots_topic_id_idx on numa.source_snapshots(topic_id);

create table numa.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  topic_id uuid references numa.topics(id) on delete set null,
  goal_type text not null check (goal_type in ('understand', 'presentation', 'compare')),
  goal_details jsonb not null default '{}'::jsonb,
  level text not null check (level in ('beginner', 'familiar', 'advanced')),
  language text not null default 'en' check (language = 'en'),
  duration_target integer not null check (duration_target in (5, 10, 20)),
  state text not null check (state in ('draft', 'preparing', 'available', 'completed', 'interrupted', 'failed')),
  active_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_owner_state_idx on numa.sessions(owner_id, state, updated_at desc);
create index sessions_topic_id_idx on numa.sessions(topic_id);

create table numa.session_revisions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references numa.sessions(id) on delete cascade,
  parent_revision_id uuid references numa.session_revisions(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  source_snapshot_id uuid not null references numa.source_snapshots(id) on delete restrict,
  memory_snapshot jsonb,
  reason text not null,
  state text not null check (state in ('planned', 'generating', 'playable', 'complete', 'superseded', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (session_id, sequence)
);
create index session_revisions_session_id_idx on numa.session_revisions(session_id, sequence);
create index session_revisions_parent_id_idx on numa.session_revisions(parent_revision_id);
alter table numa.sessions add constraint sessions_active_revision_id_fkey foreign key (active_revision_id) references numa.session_revisions(id) on delete set null;

create table numa.chapters (
  id uuid primary key default gen_random_uuid(),
  created_in_revision_id uuid not null references numa.session_revisions(id) on delete restrict,
  objective text not null,
  script jsonb not null,
  audio_key text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  status text not null check (status in ('planned', 'script_ready', 'synthesizing', 'ready', 'failed', 'cancelled')),
  created_at timestamptz not null default now()
);
create index chapters_revision_id_idx on numa.chapters(created_in_revision_id);

create table numa.revision_chapters (
  revision_id uuid not null references numa.session_revisions(id) on delete cascade,
  chapter_id uuid not null references numa.chapters(id) on delete restrict,
  position integer not null check (position >= 0),
  primary key (revision_id, chapter_id),
  unique (revision_id, position)
);
create index revision_chapters_chapter_id_idx on numa.revision_chapters(chapter_id);

create table numa.transcript_spans (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references numa.chapters(id) on delete cascade,
  speaker text not null check (speaker in ('host_a', 'host_b')),
  text text not null,
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null check (end_ms >= start_ms),
  citation_ids uuid[] not null default '{}'
);
create index transcript_spans_chapter_time_idx on numa.transcript_spans(chapter_id, start_ms);

create table numa.playback_cursors (
  user_id uuid not null references numa.users(id) on delete cascade,
  session_id uuid not null references numa.sessions(id) on delete cascade,
  revision_id uuid not null references numa.session_revisions(id) on delete restrict,
  chapter_id uuid not null references numa.chapters(id) on delete restrict,
  offset_ms integer not null check (offset_ms >= 0),
  cursor_version bigint not null default 0 check (cursor_version >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id)
);
create index playback_cursors_session_id_idx on numa.playback_cursors(session_id);
create index playback_cursors_revision_id_idx on numa.playback_cursors(revision_id);
create index playback_cursors_chapter_id_idx on numa.playback_cursors(chapter_id);

create table numa.interactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  session_id uuid not null references numa.sessions(id) on delete cascade,
  revision_id uuid not null references numa.session_revisions(id) on delete restrict,
  chapter_id uuid not null references numa.chapters(id) on delete restrict,
  offset_ms integer not null check (offset_ms >= 0),
  type text not null check (type in ('ask', 'explain_this', 'i_know_this')),
  submitted_text text,
  answer jsonb,
  citation_ids uuid[] not null default '{}',
  status text not null,
  created_at timestamptz not null default now()
);
create index interactions_session_created_idx on numa.interactions(session_id, created_at desc);
create index interactions_owner_id_idx on numa.interactions(owner_id);
create index interactions_revision_id_idx on numa.interactions(revision_id);

create table numa.adaptations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  interaction_id uuid not null references numa.interactions(id) on delete cascade,
  base_revision_id uuid not null references numa.session_revisions(id) on delete restrict,
  safe_boundary integer not null check (safe_boundary >= 0),
  cursor_version bigint not null check (cursor_version >= 0),
  proposal jsonb not null,
  state text not null check (state in ('proposed', 'accepted', 'generating', 'ready', 'activated', 'rejected', 'stale', 'failed', 'cancelled')),
  result_revision_id uuid references numa.session_revisions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index adaptations_interaction_id_idx on numa.adaptations(interaction_id);
create index adaptations_owner_state_idx on numa.adaptations(owner_id, state);
create index adaptations_base_revision_id_idx on numa.adaptations(base_revision_id);

create table numa.concepts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  label text not null,
  domain text not null,
  description text,
  canonical_key text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, canonical_key)
);
create index concepts_owner_id_idx on numa.concepts(owner_id);

create table numa.concept_evidence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  concept_id uuid not null references numa.concepts(id) on delete cascade,
  session_id uuid not null references numa.sessions(id) on delete cascade,
  type text not null check (type in ('exposure', 'self_report', 'explain_back', 'gap', 'not_assessed')),
  evidence_text text,
  source_version_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  rejected_at timestamptz
);
create index concept_evidence_concept_active_idx on numa.concept_evidence(concept_id, created_at desc) where rejected_at is null;
create index concept_evidence_owner_id_idx on numa.concept_evidence(owner_id);
create index concept_evidence_session_id_idx on numa.concept_evidence(session_id);

create table numa.teachbacks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  session_id uuid not null references numa.sessions(id) on delete cascade,
  revision_id uuid not null references numa.session_revisions(id) on delete restrict,
  prompt text not null,
  raw_audio_key text,
  transcript text,
  edited_transcript text,
  status text not null check (status in ('recording_or_draft', 'transcribed', 'user_confirmed', 'assessing', 'assessed', 'unassessable', 'failed')),
  created_at timestamptz not null default now()
);
create index teachbacks_session_id_idx on numa.teachbacks(session_id, created_at desc);
create index teachbacks_owner_id_idx on numa.teachbacks(owner_id);
create index teachbacks_revision_id_idx on numa.teachbacks(revision_id);

create table numa.assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  teachback_id uuid not null references numa.teachbacks(id) on delete cascade,
  rubric_version text not null,
  model_version text not null,
  findings jsonb not null,
  citation_ids uuid[] not null default '{}',
  assessability text not null check (assessability in ('assessable', 'cannot_assess')),
  created_at timestamptz not null default now()
);
create index assessments_teachback_id_idx on numa.assessments(teachback_id);
create index assessments_owner_id_idx on numa.assessments(owner_id);

create table numa.review_checkpoints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  topic_id uuid not null references numa.topics(id) on delete cascade,
  snapshot_id uuid not null references numa.source_snapshots(id) on delete restrict,
  session_revision_id uuid not null references numa.session_revisions(id) on delete restrict,
  marked_reviewed_at timestamptz not null default now()
);
create index review_checkpoints_topic_date_idx on numa.review_checkpoints(topic_id, marked_reviewed_at desc);
create index review_checkpoints_owner_id_idx on numa.review_checkpoints(owner_id);
create unique index review_checkpoints_one_active_idx on numa.review_checkpoints(topic_id) where marked_reviewed_at is not null;

create table numa.change_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  topic_id uuid not null references numa.topics(id) on delete cascade,
  baseline_id uuid not null references numa.review_checkpoints(id) on delete restrict,
  new_snapshot_id uuid not null references numa.source_snapshots(id) on delete restrict,
  items jsonb not null default '[]'::jsonb,
  state text not null check (state in ('pending', 'comparing', 'ready', 'no_material_change', 'failed')),
  created_at timestamptz not null default now()
);
create index change_sets_topic_created_idx on numa.change_sets(topic_id, created_at desc);
create index change_sets_owner_id_idx on numa.change_sets(owner_id);
create index change_sets_baseline_id_idx on numa.change_sets(baseline_id);
create index change_sets_new_snapshot_id_idx on numa.change_sets(new_snapshot_id);

create table numa.outcomes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  session_id uuid not null references numa.sessions(id) on delete cascade,
  revision_id uuid not null references numa.session_revisions(id) on delete restrict,
  type text not null check (type in ('notes', 'flashcards', 'slide_outline', 'comparison', 'audio')),
  content jsonb not null,
  source_snapshot_id uuid not null references numa.source_snapshots(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  user_edited_at timestamptz,
  status text not null check (status in ('draft', 'ready', 'unavailable', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outcomes_session_type_idx on numa.outcomes(session_id, type, created_at desc);
create index outcomes_owner_id_idx on numa.outcomes(owner_id);
create index outcomes_revision_id_idx on numa.outcomes(revision_id);
create index outcomes_snapshot_id_idx on numa.outcomes(source_snapshot_id);

create table numa.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references numa.users(id) on delete cascade,
  type text not null check (type in ('source_ingest', 'session_generate', 'adaptation', 'assessment', 'comparison', 'changes', 'export', 'deletion')),
  input_version text not null,
  idempotency_key text not null,
  state text not null check (state in ('queued', 'running', 'retry_wait', 'succeeded', 'failed', 'cancel_requested', 'cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  checkpoint text,
  error_code text,
  cost_reserved numeric(12,6) not null default 0 check (cost_reserved >= 0),
  cost_actual numeric(12,6) not null default 0 check (cost_actual >= 0),
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, type, idempotency_key)
);
create index jobs_owner_id_idx on numa.jobs(owner_id, created_at desc);
create index jobs_runnable_idx on numa.jobs(available_at, created_at) where state in ('queued', 'retry_wait', 'cancel_requested');

comment on table numa.jobs is 'Workers must atomically claim runnable rows with FOR UPDATE SKIP LOCKED or use an equivalent durable Vercel Workflow ledger.';
comment on schema numa is 'Private Numa application data. Grant only explicit table privileges to a non-superuser application role.';
