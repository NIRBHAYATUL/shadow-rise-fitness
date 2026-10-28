# Safety persistence and QA status (28 October 2026)

Production project: https://supabase.com/dashboard/project/ahokjyjxucccbfzgpwmc/sql
Live website: https://shadow-rise-fitness.lovable.app

## NOT deployed
- 20261028_atomic_safety.sql is a proposed additive migration, tested with PGlite.
- Production SQL entry repeatedly duplicated text or lost COMMIT. No migration was run.
- ATOMIC_SAVE_ENABLED remains false. Existing full JSON saves still have a cross-device stale-write risk. Do not claim otherwise.
- Future progression and second-set code are dormant. Both progression flags are false. No readiness or scope is inferred from a date.
- Database guard must be reviewed, reliably applied and race-tested before the atomic client can be enabled. Existing locks and pain holds cannot clear via this proposed trigger; a future reviewed clearance mechanism is still required.

## Read-only production evidence
- player_state: user_id UUID PK, avatar text, progress JSONB, updated_at timestamptz. No profiles table.
- Auth.users FK with ON DELETE CASCADE. Per-user auth.uid read/insert/update RLS policies.
- No non-internal player_state triggers found.
- A private pre-migration row count and data hash were captured for later comparison.
- No user data changed; no accounts deleted.
- The exact candidate ledger is stored privately, not in source control. Creation provenance and other auth dependencies remain to be checked before any deletion. A nonzero-progress candidate is held pending original provenance.

## Verification still required
- Production schema, constraints/policies and full exact migration check immediately before application.
- After application: unchanged row count/data hash (unless real user activity explains a difference), RPC grants, revision behavior, old-client safety retention, two-device conflict rejection, RLS isolation and canonical flags returned to UI.
- Client UI test with a conflict must show failure, not Saved. Do not silently retry stale data.
- Test scripts use isolated state. They do not prove medical safety or production persistence.
