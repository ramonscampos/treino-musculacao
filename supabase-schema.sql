-- ============================================
-- IRON PROTOCOL - SCHEMA COMPLETO SUPABASE
-- ============================================
-- Rode isso no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/_/sql

-- ============================================
-- TABELAS
-- ============================================

-- Profiles (linkado ao auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  theme_color TEXT NOT NULL DEFAULT 'green',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migração: Caso a tabela profiles já exista e ainda tenha a coluna antiga 'theme'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='theme'
  ) THEN
    ALTER TABLE profiles RENAME COLUMN theme TO theme_color;
    ALTER TABLE profiles ALTER COLUMN theme_color SET DEFAULT 'green';
    UPDATE profiles SET theme_color = 'green' WHERE theme_color = 'default';
  END IF;
END $$;

-- Migração: Ajustar programs.rest_days para ser do tipo INTEGER
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='programs' AND column_name='rest_days' AND data_type != 'integer'
  ) THEN
    ALTER TABLE programs DROP COLUMN rest_days;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='programs' AND column_name='rest_days'
  ) THEN
    ALTER TABLE programs ADD COLUMN rest_days INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;


-- Programas de treino (ex: Plano de Hipertrofia)
CREATE TABLE IF NOT EXISTS programs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rest_days INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercícios (biblioteca por usuário)
CREATE TABLE IF NOT EXISTS exercises (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planos de treino (ex: Peito + Tríceps) dentro de um programa
CREATE TABLE IF NOT EXISTS workout_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id BIGINT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  suggested_day TEXT NOT NULL,
  extra TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercícios dentro dos planos
CREATE TABLE IF NOT EXISTS plan_exercises (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sets INTEGER,
  reps_min INTEGER,
  reps_max INTEGER,
  rest_seconds INTEGER,
  muscle_focus TEXT,
  execution_cues JSONB NOT NULL DEFAULT '[]',
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_superset_with BIGINT,
  extra TEXT
);

-- Sessões de treino (um por dia)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  performed_on DATE NOT NULL,
  UNIQUE(user_id, performed_on)
);

-- Carga atual (uma por exercício por plano)
CREATE TABLE IF NOT EXISTS exercise_loads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  weights NUMERIC[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, plan_id, exercise_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_loads ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "own profile" ON profiles;
CREATE POLICY "own profile" ON profiles
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- programs
DROP POLICY IF EXISTS "own programs" ON programs;
CREATE POLICY "own programs" ON programs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- exercises
DROP POLICY IF EXISTS "own exercises" ON exercises;
CREATE POLICY "own exercises" ON exercises
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- workout_plans
DROP POLICY IF EXISTS "own plans" ON workout_plans;
CREATE POLICY "own plans" ON workout_plans
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- plan_exercises
DROP POLICY IF EXISTS "own plan exercises" ON plan_exercises;
CREATE POLICY "own plan exercises" ON plan_exercises
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- workout_sessions
DROP POLICY IF EXISTS "own sessions" ON workout_sessions;
CREATE POLICY "own sessions" ON workout_sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- exercise_loads
DROP POLICY IF EXISTS "own exercise loads" ON exercise_loads;
CREATE POLICY "own exercise loads" ON exercise_loads
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- TRIGGER: CRIAR PROFILE AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuário'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
