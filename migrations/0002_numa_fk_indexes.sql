-- Follow-up indexes reported by the Supabase database advisor after 0001.

create index adaptations_result_revision_id_idx on numa.adaptations(result_revision_id);
create index interactions_chapter_id_idx on numa.interactions(chapter_id);
create index review_checkpoints_session_revision_id_idx on numa.review_checkpoints(session_revision_id);
create index review_checkpoints_snapshot_id_idx on numa.review_checkpoints(snapshot_id);
create index session_revisions_source_snapshot_id_idx on numa.session_revisions(source_snapshot_id);
create index sessions_active_revision_id_idx on numa.sessions(active_revision_id);
