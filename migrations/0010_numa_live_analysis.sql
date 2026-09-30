-- A topic may have many explicit review baselines. Historical checkpoints stay
-- immutable; the newest checkpoint is the current baseline until the learner
-- explicitly creates another one.
drop index if exists numa.review_checkpoints_one_active_idx;
create index if not exists review_checkpoints_topic_reviewed_idx
  on numa.review_checkpoints(topic_id, marked_reviewed_at desc);
