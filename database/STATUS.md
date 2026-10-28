# Safety persistence and QA status (28 October 2026)

Production project: https://supabase.com/dashboard/project/ahokjyjxucccbfzgpwmc/sql
Live website: https://shadow-rise-fitness.lovable.app

## Deployed (28 October 2026)
- 20261028_atomic_safety.sql was applied to production through the SQL editor (model value set programmatically, text verified identical to this file before Run).
- Post-apply checks: revision column, srf_atomic_guard trigger, srf_save_state (authenticated only, not anon/PUBLIC), RLS and 3 policies in place; the existing player row was unchanged.
- Production tests with one disposable account (removed afterwards): create, stale create rejected, stale second-device save rejected, two simultaneous saves (one wins, one rejected), old-style blind upsert cannot clear a programme lock or pain hold, anonymous call denied, invalid keys rejected, only own row visible.
- The client uses srf_save_state (ATOMIC_SAVE_ENABLED=true). A conflict shows an error, never "Saved". Missing migration fails closed.
- Progression and second-set flags remain false. There is deliberately no route to clear a lock or hold; that needs a reviewed workflow.
- These tests prove the save guard only. They are not medical validation.

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

## Update 28 Oct 2026 (late): migration applied and live-checked
- Migration 20261028_atomic_safety is applied in production. Race, stale-write, RLS and old-client tests passed.
- Client: atomic saves are on. A rejected symptom report is kept in a per-account local outbox (keyed by auth user id, kept on logout, never shown to or merged into another account) and retried after login.
- Live checks with disposable accounts (deleted afterwards): conflict shows failure not Saved; offline symptom and per-exercise hold kept, then confirmed on the server after reconnect with a concurrent server change preserved; two-account isolation; logout and login keeps the pending entry.
- Limits: offline was simulated by failing network calls in a test frame, and the date was shifted in that frame only. This is not a full offline browser test.
- Cold start without a connection now shows "Cannot verify your login" instead of the sign-up screen.
- A Tier 1 symptom lock now also pauses workouts: no exercise list, no start, no timer. Symptom reporting, rest and navigation stay. There is still no in-app way to clear a lock.
- Progression and second sets stay off. This is not medical validation.
