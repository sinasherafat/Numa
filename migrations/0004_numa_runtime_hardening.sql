-- Keep the workflow credential digest unreachable through PostgREST even if
-- grants change later. Security-definer functions remain the only access path.
alter table numa.runtime_secrets enable row level security;

-- Correlate the application ledger with Vercel Workflow without making the
-- provider's run identifier the source of truth for ownership or idempotency.
alter table numa.jobs add column workflow_run_id text;
create unique index jobs_workflow_run_id_idx
  on numa.jobs(workflow_run_id)
  where workflow_run_id is not null;
