-- Replace load history (load_logs + load_log_sets) with a single current load
-- per (user, plan, exercise).

CREATE TABLE IF NOT EXISTS exercise_loads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  weights NUMERIC[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, plan_id, exercise_id)
);

ALTER TABLE exercise_loads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own exercise loads" ON exercise_loads;
CREATE POLICY "own exercise loads" ON exercise_loads
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Keep only the latest log per (user, plan, exercise)
INSERT INTO exercise_loads (user_id, plan_id, exercise_id, weights, updated_at)
SELECT DISTINCT ON (l.user_id, l.plan_id, l.exercise_id)
  l.user_id,
  l.plan_id,
  l.exercise_id,
  COALESCE(
    (SELECT array_agg(s.weight ORDER BY s.set_number) FROM load_log_sets s WHERE s.log_id = l.id),
    '{}'
  ),
  l.logged_at::timestamptz
FROM load_logs l
WHERE l.plan_id IS NOT NULL
ORDER BY l.user_id, l.plan_id, l.exercise_id, l.logged_at DESC
ON CONFLICT DO NOTHING;

-- Legacy logs without plan_id: apply the latest one to every plan that has the exercise
INSERT INTO exercise_loads (user_id, plan_id, exercise_id, weights, updated_at)
SELECT pe.user_id, pe.plan_id, pe.exercise_id, legacy.weights, legacy.logged_at::timestamptz
FROM plan_exercises pe
JOIN (
  SELECT DISTINCT ON (l.user_id, l.exercise_id)
    l.user_id,
    l.exercise_id,
    l.logged_at,
    COALESCE(
      (SELECT array_agg(s.weight ORDER BY s.set_number) FROM load_log_sets s WHERE s.log_id = l.id),
      '{}'
    ) AS weights
  FROM load_logs l
  WHERE l.plan_id IS NULL
  ORDER BY l.user_id, l.exercise_id, l.logged_at DESC
) legacy ON legacy.user_id = pe.user_id AND legacy.exercise_id = pe.exercise_id
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS load_log_sets;
DROP TABLE IF EXISTS load_logs;
