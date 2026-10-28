-- Additive migration. Existing accounts, XP and progress stay in place.
-- Old clients remain compatible. Safety flags cannot be cleared by stale JSON writes.
-- Deliberately no client-facing clearance function; a reviewed clearance workflow is still required.
BEGIN;
ALTER TABLE public.player_state ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 1;
CREATE OR REPLACE FUNCTION public.srf_guard_player_state() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE oldprog jsonb; newprog jsonb; oldholds jsonb; newholds jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.revision := OLD.revision + 1;
    oldprog := COALESCE(OLD.progress->'prog', '{}'::jsonb);
    newprog := COALESCE(NEW.progress->'prog', '{}'::jsonb);
    IF jsonb_typeof(oldprog) <> 'object' THEN oldprog := '{}'::jsonb; END IF;
    IF jsonb_typeof(newprog) <> 'object' THEN newprog := '{}'::jsonb; END IF;
    IF jsonb_typeof(oldprog->'lock') = 'object' THEN
      newprog := jsonb_set(newprog, '{lock}', oldprog->'lock', true);
    END IF;
    oldholds := oldprog->'holds'; newholds := newprog->'holds';
    IF jsonb_typeof(oldholds) = 'object' AND oldholds <> '{}'::jsonb THEN
      IF jsonb_typeof(newholds) IS DISTINCT FROM 'object' THEN newholds := '{}'::jsonb; END IF;
      newprog := jsonb_set(newprog, '{holds}', newholds || oldholds, true);
    END IF;
    IF newprog <> '{}'::jsonb THEN
      NEW.progress := jsonb_set(COALESCE(NEW.progress,'{}'::jsonb), '{prog}', newprog, true);
    END IF;
  ELSE
    NEW.revision := 1;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS srf_atomic_guard ON public.player_state;
CREATE TRIGGER srf_atomic_guard BEFORE INSERT OR UPDATE ON public.player_state
FOR EACH ROW EXECUTE FUNCTION public.srf_guard_player_state();
-- SECURITY INVOKER uses the existing per-user row policies, not an admin identity.
CREATE OR REPLACE FUNCTION public.srf_save_state(expected_revision bigint, state_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); current_revision bigint; next_revision bigint;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF state_patch IS NULL OR jsonb_typeof(state_patch) <> 'object' THEN RAISE EXCEPTION 'Invalid patch'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(state_patch) k WHERE k NOT IN ('avatar','progress')) THEN RAISE EXCEPTION 'Invalid patch keys'; END IF;
  SELECT revision INTO current_revision FROM public.player_state WHERE user_id=uid FOR UPDATE;
  IF NOT FOUND THEN
    IF expected_revision <> 0 THEN RAISE EXCEPTION 'SRF_CONFLICT'; END IF;
    BEGIN
      INSERT INTO public.player_state(user_id,avatar,progress)
      VALUES(uid,state_patch->>'avatar',COALESCE(state_patch->'progress','{"xp":0,"doneDays":[],"pending":null}'::jsonb)) RETURNING revision INTO next_revision;
    EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'SRF_CONFLICT'; END;
  ELSE
    IF current_revision IS DISTINCT FROM expected_revision THEN RAISE EXCEPTION 'SRF_CONFLICT'; END IF;
    UPDATE public.player_state SET
      avatar=CASE WHEN state_patch ? 'avatar' THEN state_patch->>'avatar' ELSE avatar END,
      progress=CASE WHEN state_patch ? 'progress' THEN state_patch->'progress' ELSE progress END
      WHERE user_id=uid RETURNING revision INTO next_revision;
  END IF;
  RETURN (SELECT jsonb_build_object('revision',revision,'progress',progress,'avatar',avatar) FROM public.player_state WHERE user_id=uid);
END $$;
REVOKE ALL ON FUNCTION public.srf_save_state(bigint,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.srf_save_state(bigint,jsonb) TO authenticated;
COMMIT;
