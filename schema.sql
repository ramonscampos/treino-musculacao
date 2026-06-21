CREATE TABLE IF NOT EXISTS users (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  name          TEXT NOT NULL,
  suggested_day TEXT NOT NULL,
  title         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_exercises (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id          INTEGER NOT NULL REFERENCES workout_plans(id),
  exercise_id      INTEGER NOT NULL REFERENCES exercises(id),
  sets             INTEGER,
  reps_min         INTEGER,
  reps_max         INTEGER,
  rest_seconds     INTEGER,
  muscle_focus     TEXT,
  execution_cues   TEXT,
  note             TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_superset_with INTEGER REFERENCES plan_exercises(id),
  extra            TEXT
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  plan_id      INTEGER NOT NULL REFERENCES workout_plans(id),
  performed_on TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS load_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  logged_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS load_log_sets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id     INTEGER NOT NULL REFERENCES load_logs(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight     REAL NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_load_logs_user_exercise_date
  ON load_logs (user_id, exercise_id, logged_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_workout_sessions_user_date
  ON workout_sessions (user_id, performed_on);
