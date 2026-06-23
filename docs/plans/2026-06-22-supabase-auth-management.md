# Supabase + Auth + Workout Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from Turso/libSQL to Supabase, add Google + Apple social auth replacing the current UserSelector, and add a workout management screen for CRUD of plans and exercises per user.

**Architecture:** Replace the exposed Turso auth token with Supabase (anon key is safe to expose). Supabase Auth handles Google/Apple OAuth and issues JWTs used automatically by the JS client. Row Level Security on every table enforces data isolation per user without a backend. A new ManageScreen overlay (gear icon in header) provides CRUD for plans and exercises. The existing workout view layout remains unchanged.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS v4, `@supabase/supabase-js`, Supabase Auth (Google + Apple OAuth), Supabase Postgres with RLS

---

## File Map

### Modified
- `src/lib/db.ts` → replaced by `src/lib/supabase.ts`
- `src/types/index.ts` — `User.id: number` → `string` (UUID), `userId: number` → `string` everywhere
- `src/hooks/useUser.ts` → replaced by `src/hooks/useAuth.ts`
- `src/App.tsx` — swap `useUser` for `useAuth`, render `LoginScreen` when unauthenticated
- `src/components/UserSelector.tsx` → replaced by `src/components/auth/LoginScreen.tsx`
- `src/lib/queries/plans.ts` — rewrite with Supabase client (no userId param, RLS handles it)
- `src/lib/queries/loads.ts` — rewrite with Supabase client
- `src/lib/queries/sessions.ts` — rewrite with Supabase client
- `src/hooks/useWorkoutPlan.ts` — `userId: number` → `string`
- `src/hooks/useLoadLogs.ts` — `userId: number` → `string`
- `src/components/WorkoutView/WorkoutView.tsx` — add gear button to header

### Created
- `src/lib/supabase.ts` — Supabase client singleton
- `src/hooks/useAuth.ts` — auth state hook (session, user, signIn, signOut)
- `src/components/auth/LoginScreen.tsx` — Google + Apple login buttons
- `src/lib/queries/manage.ts` — CRUD functions for plans, exercises, plan_exercises
- `src/components/manage/ManageScreen.tsx` — full-screen overlay, internal navigation
- `src/components/manage/PlanList.tsx` — list of user's plans with edit/delete
- `src/components/manage/PlanEditor.tsx` — create/edit plan + its exercises
- `src/components/manage/ExercisePicker.tsx` — search user library + inline create

---

## Task 1: Install Supabase SDK and configure environment

**Files:**
- Modify: `package.json`
- Create: `.env.local` (gitignored)

- [ ] **Step 1: Install Supabase JS client**

```bash
yarn add @supabase/supabase-js
```

- [ ] **Step 2: Create Supabase project**

Go to https://supabase.com/dashboard → New project. Note the Project URL and anon key from Settings > API.

- [ ] **Step 3: Add env vars to `.env.local`**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Remove `VITE_TURSO_DATABASE_URL` and `VITE_TURSO_AUTH_TOKEN` from `.env.local`.

- [ ] **Step 4: Verify `.env.local` is in `.gitignore`**

```bash
grep ".env.local" .gitignore
```

Expected: `.env.local` is listed. If not, add it.

- [ ] **Step 5: Commit**

```bash
git add package.json yarn.lock
git commit -m "feat: add @supabase/supabase-js"
```

---

## Task 2: Create Supabase schema and RLS policies

**Files:**
- Reference: Supabase SQL Editor (dashboard)

- [ ] **Step 1: Run schema SQL in Supabase SQL Editor**

Go to Supabase Dashboard > SQL Editor > New query. Paste and run:

```sql
-- Profiles (linked to auth.users, stores display name + theme preference)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises (per user library)
CREATE TABLE exercises (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout plans
CREATE TABLE workout_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  suggested_day TEXT NOT NULL,
  extra TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan exercises (junction: plan + exercise with load params)
CREATE TABLE plan_exercises (
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

-- Workout sessions (one per day per user)
CREATE TABLE workout_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id BIGINT NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  performed_on DATE NOT NULL,
  UNIQUE(user_id, performed_on)
);

-- Load logs (one per exercise per day per user)
CREATE TABLE load_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  logged_at DATE NOT NULL,
  UNIQUE(user_id, exercise_id, logged_at)
);

-- Load log sets
CREATE TABLE load_log_sets (
  id BIGSERIAL PRIMARY KEY,
  log_id BIGINT NOT NULL REFERENCES load_logs(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight NUMERIC NOT NULL
);
```

- [ ] **Step 2: Enable RLS and create policies**

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_log_sets ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "own profile" ON profiles FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- exercises
CREATE POLICY "own exercises" ON exercises FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- workout_plans
CREATE POLICY "own plans" ON workout_plans FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- plan_exercises
CREATE POLICY "own plan exercises" ON plan_exercises FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- workout_sessions
CREATE POLICY "own sessions" ON workout_sessions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- load_logs
CREATE POLICY "own load logs" ON load_logs FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- load_log_sets (via load_logs join)
CREATE POLICY "own load sets" ON load_log_sets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM load_logs
    WHERE load_logs.id = log_id AND load_logs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM load_logs
    WHERE load_logs.id = log_id AND load_logs.user_id = auth.uid()
  ));
```

- [ ] **Step 3: Create trigger to auto-create profile on signup**

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuário'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 4: Verify tables exist**

In Supabase Dashboard > Table Editor, confirm 7 tables: `profiles`, `exercises`, `workout_plans`, `plan_exercises`, `workout_sessions`, `load_logs`, `load_log_sets`.

---

## Task 3: Configure Google and Apple OAuth providers

**Files:**
- Reference: Supabase Dashboard > Authentication > Providers

- [ ] **Step 1: Configure Google OAuth**

1. Go to [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase Dashboard > Authentication > Providers > Google: enable, paste credentials

- [ ] **Step 2: Configure Apple OAuth**

1. Go to [Apple Developer](https://developer.apple.com) > Certificates, IDs & Profiles
2. Create App ID with Sign In with Apple capability
3. Create Services ID (used as Client ID)
4. Create private key for Sign In with Apple
5. In Supabase Dashboard > Authentication > Providers > Apple: enable, paste credentials
6. Add Supabase callback URL to Apple Services ID: `https://your-project.supabase.co/auth/v1/callback`

- [ ] **Step 3: Set Site URL in Supabase**

Supabase Dashboard > Authentication > URL Configuration:
- Site URL: `http://localhost:5173` (change to production URL when deploying)
- Redirect URLs: add `http://localhost:5173`

---

## Task 4: Create Supabase client and update TypeScript types

**Files:**
- Create: `src/lib/supabase.ts`
- Modify: `src/types/index.ts`
- Delete: `src/lib/db.ts`

- [ ] **Step 1: Create `src/lib/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
);
```

- [ ] **Step 2: Update `src/types/index.ts` — change User.id to string**

Change:
```typescript
export interface User {
  id: number;
  name: string;
}
```
To:
```typescript
export interface User {
  id: string; // UUID from auth.users
  name: string;
  theme?: string;
}
```

Change all `userId: number` to `userId: string` in:
- `WorkoutPlan.userId`
- `WorkoutSession.userId`
- `LoadLog.userId`

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts src/types/index.ts
git rm src/lib/db.ts
git commit -m "feat: add supabase client, update User type to uuid"
```

---

## Task 5: Rewrite query files with Supabase client

**Files:**
- Modify: `src/lib/queries/plans.ts`
- Modify: `src/lib/queries/loads.ts`
- Modify: `src/lib/queries/sessions.ts`

Note: With RLS active, the Supabase client automatically filters by the authenticated user. No need to pass `userId` to queries — RLS does it. The function signatures that accept `userId` are kept for compatibility but not used in the query body (RLS handles it).

- [ ] **Step 1: Rewrite `src/lib/queries/plans.ts`**

```typescript
import type { PlanExercise, WorkoutPlan } from "../../types";
import { supabase } from "../supabase";

export async function getPlansForUser(): Promise<WorkoutPlan[]> {
  const { data, error } = await supabase
    .from("workout_plans")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id as number,
    userId: r.user_id as string,
    name: r.name as string,
    suggestedDay: r.suggested_day as WorkoutPlan["suggestedDay"],
    title: r.title as string,
    extra: r.extra as string | undefined,
  }));
}

export async function getPlanExercises(planId: number): Promise<PlanExercise[]> {
  const { data, error } = await supabase
    .from("plan_exercises")
    .select(`*, exercises(name, description)`)
    .eq("plan_id", planId)
    .order("sort_order");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id as number,
    planId: r.plan_id as number,
    exerciseId: r.exercise_id as number,
    exerciseName: (r.exercises as { name: string }).name,
    description: (r.exercises as { description?: string }).description,
    sets: r.sets as number | undefined,
    repsMin: r.reps_min as number | undefined,
    repsMax: r.reps_max as number | undefined,
    restSeconds: r.rest_seconds as number | undefined,
    muscleFocus: r.muscle_focus as string | undefined,
    executionCues: (r.execution_cues as string[]) ?? [],
    note: r.note as string | undefined,
    sortOrder: r.sort_order as number,
    isSupersetWith: r.is_superset_with as number | undefined,
    extra: r.extra as string | undefined,
  }));
}
```

- [ ] **Step 2: Rewrite `src/lib/queries/sessions.ts`**

```typescript
import type { WorkoutSession } from "../../types";
import { supabase } from "../supabase";

export async function getSessionForDate(
  _userId: string,
  date: string,
): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("performed_on", date)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as number,
    userId: data.user_id as string,
    planId: data.plan_id as number,
    performedOn: data.performed_on as string,
  };
}

export async function upsertSession(
  _userId: string,
  planId: number,
  date: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("workout_sessions").upsert(
    { user_id: user.id, plan_id: planId, performed_on: date },
    { onConflict: "user_id,performed_on" },
  );
  if (error) throw error;
}

export async function getSessionsInRange(
  _userId: string,
  from: string,
  to: string,
): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .gte("performed_on", from)
    .lte("performed_on", to)
    .order("performed_on");
  if (error) throw error;
  return data.map((r) => ({
    id: r.id as number,
    userId: r.user_id as string,
    planId: r.plan_id as number,
    performedOn: r.performed_on as string,
  }));
}

export async function deleteSession(
  _userId: string,
  date: string,
): Promise<void> {
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("performed_on", date);
  if (error) throw error;
}
```

- [ ] **Step 3: Rewrite `src/lib/queries/loads.ts`**

```typescript
import type { LoadLog } from "../../types";
import { supabase } from "../supabase";

export async function getLastLoad(
  _userId: string,
  exerciseId: number,
): Promise<LoadLog | null> {
  const { data, error } = await supabase
    .from("load_logs")
    .select("*, load_log_sets(*)")
    .eq("exercise_id", exerciseId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapLog(data);
}

export async function getLoadForDate(
  _userId: string,
  exerciseId: number,
  date: string,
): Promise<LoadLog | null> {
  const { data, error } = await supabase
    .from("load_logs")
    .select("*, load_log_sets(*)")
    .eq("exercise_id", exerciseId)
    .eq("logged_at", date)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapLog(data);
}

export async function getAllLoadsForExercise(
  _userId: string,
  exerciseId: number,
): Promise<LoadLog[]> {
  const { data, error } = await supabase
    .from("load_logs")
    .select("*, load_log_sets(*)")
    .eq("exercise_id", exerciseId)
    .order("logged_at");
  if (error) throw error;
  return data.map(mapLog);
}

export async function upsertLoad(
  _userId: string,
  exerciseId: number,
  date: string,
  weights: number[],
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: log, error: logError } = await supabase
    .from("load_logs")
    .upsert(
      { user_id: user.id, exercise_id: exerciseId, logged_at: date },
      { onConflict: "user_id,exercise_id,logged_at" },
    )
    .select("id")
    .single();
  if (logError) throw logError;

  await supabase.from("load_log_sets").delete().eq("log_id", log.id);

  if (weights.length > 0) {
    const { error: setsError } = await supabase.from("load_log_sets").insert(
      weights.map((weight, i) => ({
        log_id: log.id,
        set_number: i + 1,
        weight,
      })),
    );
    if (setsError) throw setsError;
  }
}

function mapLog(data: Record<string, unknown>): LoadLog {
  const sets = (data.load_log_sets as Array<Record<string, unknown>>) ?? [];
  return {
    id: data.id as number,
    userId: data.user_id as string,
    exerciseId: data.exercise_id as number,
    loggedAt: data.logged_at as string,
    sets: sets
      .sort((a, b) => (a.set_number as number) - (b.set_number as number))
      .map((s) => ({
        id: s.id as number,
        logId: s.log_id as number,
        setNumber: s.set_number as number,
        weight: s.weight as number,
      })),
  };
}
```

- [ ] **Step 4: Update `useWorkoutPlan.ts` — change `userId` param type to string**

In `src/hooks/useWorkoutPlan.ts`, change:
```typescript
export function useWorkoutPlan(userId: number, refreshTrigger?: number)
```
to:
```typescript
export function useWorkoutPlan(userId: string, refreshTrigger?: number)
```

Also update the `getPlansForUser` call — it no longer needs `userId`:
```typescript
// Before
getPlansForUser(userId).then(setPlans);
// After
getPlansForUser().then(setPlans);
```

Clear the exercisesCache on plan refresh by adding this to the refresh effect:
```typescript
useEffect(() => {
  exercisesCache.clear();
  getPlansForUser().then(setPlans);
}, [userId, refreshTrigger]);
```

- [ ] **Step 5: Update `useLoadLogs.ts` — change `userId` param type to string**

In `src/hooks/useLoadLogs.ts`, change `userId: number` to `userId: string`. The functions passed through (`saveLoad`, `getLastLoggedLoad`) already call the updated query functions which ignore userId.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
yarn build 2>&1 | head -50
```

Expected: no type errors. Fix any remaining `number`/`string` mismatches on userId.

- [ ] **Step 7: Commit**

```bash
git add src/lib/queries/ src/hooks/useWorkoutPlan.ts src/hooks/useLoadLogs.ts
git commit -m "feat: rewrite queries with supabase client, remove turso dependency"
```

---

## Task 6: Create auth hook

**Files:**
- Create: `src/hooks/useAuth.ts`
- Delete: `src/hooks/useUser.ts`

- [ ] **Step 1: Create `src/hooks/useAuth.ts`**

```typescript
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { User } from "../types";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setUser(mapUser(session));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session ? mapUser(session) : null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function signInWithApple() {
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: window.location.origin },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { session, user, loading, signInWithGoogle, signInWithApple, signOut };
}

function mapUser(session: Session): User {
  const meta = session.user.user_metadata;
  return {
    id: session.user.id,
    name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? "Usuário",
    theme: "default",
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAuth.ts
git rm src/hooks/useUser.ts
git commit -m "feat: add useAuth hook with google/apple sign in"
```

---

## Task 7: Create login screen

**Files:**
- Create: `src/components/auth/LoginScreen.tsx`
- Delete: `src/components/UserSelector.tsx`

- [ ] **Step 1: Create `src/components/auth/LoginScreen.tsx`**

```tsx
interface Props {
  onSignInGoogle: () => Promise<void>;
  onSignInApple: () => Promise<void>;
}

export function LoginScreen({ onSignInGoogle, onSignInApple }: Props) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 gap-10"
      style={{ background: "var(--bg-color)" }}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div
          className="text-[0.7rem] uppercase tracking-[0.2rem] font-bold mb-1"
          style={{ color: "var(--accent-color)" }}
        >
          Iron Protocol
        </div>
        <h1
          className="text-[2.2rem] font-bold tracking-[-0.02em] leading-tight"
          style={{ color: "var(--text-primary)", fontFamily: "Outfit" }}
        >
          Seu treino,{" "}
          <span style={{ color: "var(--accent-color)" }}>evoluindo</span>.
        </h1>
        <p className="text-[0.95rem] mt-1" style={{ color: "var(--text-secondary)" }}>
          Entre para começar a registrar seu progresso.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          type="button"
          onClick={onSignInGoogle}
          className="flex items-center justify-center gap-3 w-full py-[0.9rem] px-5 rounded-2xl font-semibold text-[0.95rem] transition-all active:scale-[0.97] cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "var(--text-primary)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Entrar com Google
        </button>

        <button
          type="button"
          onClick={onSignInApple}
          className="flex items-center justify-center gap-3 w-full py-[0.9rem] px-5 rounded-2xl font-semibold text-[0.95rem] transition-all active:scale-[0.97] cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "var(--text-primary)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          Entrar com Apple
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/auth/LoginScreen.tsx
git rm src/components/UserSelector.tsx
git commit -m "feat: add login screen with google and apple buttons"
```

---

## Task 8: Update App.tsx to use auth flow and theme

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite `src/App.tsx`**

```tsx
import { useEffect } from "react";
import { LoginScreen } from "./components/auth/LoginScreen";
import { WorkoutView } from "./components/WorkoutView/WorkoutView";
import { useAuth } from "./hooks/useAuth";
import { USER_THEMES } from "./types";

export function App() {
  const { user, loading, signInWithGoogle, signInWithApple } = useAuth();

  useEffect(() => {
    if (!user) return;
    // Theme: check user.theme, fall back to first defined theme
    const theme = USER_THEMES[user.name] ?? USER_THEMES["Ramon"];
    const root = document.documentElement;
    root.style.setProperty("--accent-color", theme.accentColor);
    root.style.setProperty("--accent-glow", theme.accentGlow);
    root.style.setProperty("--accent-soft", theme.accentSoft);
    root.style.setProperty("--accent-mute", theme.accentMute);
    root.style.setProperty("--bg-color", theme.bgColor);
    root.style.setProperty("--success", theme.success);
    root.style.setProperty("--success-bg", theme.successBg);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme.bgColor);
  }, [user]);

  if (loading) return <div className="min-h-dvh" style={{ background: "var(--bg-color)" }} />;
  if (!user) return <LoginScreen onSignInGoogle={signInWithGoogle} onSignInApple={signInWithApple} />;
  return <WorkoutView user={user} />;
}
```

Note: The name-based theme lookup from `USER_THEMES` is kept for backward compat. In a future pass, themes can be stored in the `profiles` table per user and fetched here.

- [ ] **Step 2: Remove `@libsql/client` from package.json**

```bash
yarn remove @libsql/client
```

- [ ] **Step 3: Verify dev server starts without errors**

```bash
yarn dev
```

Open http://localhost:5173 — should show the LoginScreen. OAuth redirect will not work locally unless Supabase redirect URLs are configured for localhost.

- [ ] **Step 4: Test auth flow**

1. Click "Entrar com Google" → redirects to Google
2. Complete Google auth → redirects back to app
3. Should now show WorkoutView (empty — no plans seeded yet)
4. Verify in Supabase Dashboard > Authentication > Users that the new user appears

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx package.json yarn.lock
git commit -m "feat: wire auth into App, remove libsql dependency"
```

---

## Task 9: Create workout management query functions

**Files:**
- Create: `src/lib/queries/manage.ts`

- [ ] **Step 1: Create `src/lib/queries/manage.ts`**

```typescript
import { supabase } from "../supabase";
import type { WorkoutPlan, PlanExercise } from "../../types";

// --- Exercises (user library) ---

export interface Exercise {
  id: number;
  name: string;
  description?: string;
}

export async function getUserExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, description")
    .order("name");
  if (error) throw error;
  return data as Exercise[];
}

export async function createExercise(name: string, description?: string): Promise<Exercise> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("exercises")
    .insert({ user_id: user.id, name: name.trim(), description })
    .select()
    .single();
  if (error) throw error;
  return data as Exercise;
}

export async function updateExercise(id: number, name: string, description?: string): Promise<void> {
  const { error } = await supabase
    .from("exercises")
    .update({ name: name.trim(), description })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteExercise(id: number): Promise<void> {
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw error;
}

// --- Workout Plans ---

export async function createPlan(
  name: string,
  suggestedDay: WorkoutPlan["suggestedDay"],
  sortOrder: number,
): Promise<WorkoutPlan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      user_id: user.id,
      name: name.trim(),
      title: name.trim(),
      suggested_day: suggestedDay,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    suggestedDay: data.suggested_day,
    title: data.title,
    extra: data.extra,
  };
}

export async function updatePlan(
  id: number,
  updates: { name?: string; suggestedDay?: WorkoutPlan["suggestedDay"]; extra?: string },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) { payload.name = updates.name.trim(); payload.title = updates.name.trim(); }
  if (updates.suggestedDay !== undefined) payload.suggested_day = updates.suggestedDay;
  if (updates.extra !== undefined) payload.extra = updates.extra;
  const { error } = await supabase.from("workout_plans").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deletePlan(id: number): Promise<void> {
  const { error } = await supabase.from("workout_plans").delete().eq("id", id);
  if (error) throw error;
}

// --- Plan Exercises ---

export async function addExerciseToPlan(
  planId: number,
  exerciseId: number,
  params: {
    sets?: number;
    repsMin?: number;
    repsMax?: number;
    restSeconds?: number;
    muscleFocus?: string;
    note?: string;
    sortOrder: number;
  },
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("plan_exercises").insert({
    user_id: user.id,
    plan_id: planId,
    exercise_id: exerciseId,
    sets: params.sets,
    reps_min: params.repsMin,
    reps_max: params.repsMax,
    rest_seconds: params.restSeconds,
    muscle_focus: params.muscleFocus,
    note: params.note,
    sort_order: params.sortOrder,
    execution_cues: [],
  });
  if (error) throw error;
}

export async function updatePlanExercise(
  id: number,
  params: {
    sets?: number;
    repsMin?: number;
    repsMax?: number;
    restSeconds?: number;
    muscleFocus?: string;
    note?: string;
    sortOrder?: number;
  },
): Promise<void> {
  const { error } = await supabase.from("plan_exercises").update({
    sets: params.sets,
    reps_min: params.repsMin,
    reps_max: params.repsMax,
    rest_seconds: params.restSeconds,
    muscle_focus: params.muscleFocus,
    note: params.note,
    sort_order: params.sortOrder,
  }).eq("id", id);
  if (error) throw error;
}

export async function removePlanExercise(id: number): Promise<void> {
  const { error } = await supabase.from("plan_exercises").delete().eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queries/manage.ts
git commit -m "feat: add manage query functions (plans, exercises, plan_exercises crud)"
```

---

## Task 10: Create ExercisePicker component

**Files:**
- Create: `src/components/manage/ExercisePicker.tsx`

This component shows a search field over the user's exercise library. If the search term has no match, a "Criar '[termo]'" option appears. On selection/creation, calls `onSelect(exercise)`.

- [ ] **Step 1: Create `src/components/manage/ExercisePicker.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { createExercise, getUserExercises, type Exercise } from "../../lib/queries/manage";

interface Props {
  onSelect: (exercise: Exercise) => void;
  onCancel: () => void;
}

export function ExercisePicker({ onSelect, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getUserExercises().then(setExercises);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase()),
  );
  const exactMatch = exercises.some(
    (e) => e.name.toLowerCase() === query.toLowerCase(),
  );
  const showCreate = query.trim().length > 0 && !exactMatch;

  async function handleCreate() {
    if (!query.trim()) return;
    setCreating(true);
    try {
      const exercise = await createExercise(query.trim());
      onSelect(exercise);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar exercício..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-xl text-[0.95rem] outline-none"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "var(--text-primary)",
        }}
      />

      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
        {showCreate && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="text-left px-4 py-3 rounded-xl text-[0.9rem] font-medium transition-all active:opacity-70 cursor-pointer"
            style={{
              background: "var(--accent-soft)",
              border: "1px dashed var(--accent-mute)",
              color: "var(--accent-color)",
            }}
          >
            {creating ? "Criando..." : `Criar "${query.trim()}"`}
          </button>
        )}

        {filtered.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => onSelect(ex)}
            className="text-left px-4 py-3 rounded-xl text-[0.9rem] transition-all active:opacity-70 cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
            }}
          >
            {ex.name}
          </button>
        ))}

        {filtered.length === 0 && !showCreate && (
          <p className="text-center py-4 text-[0.85rem]" style={{ color: "var(--text-secondary)" }}>
            Nenhum exercício encontrado.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-[0.85rem] py-2 cursor-pointer"
        style={{ color: "var(--text-secondary)" }}
      >
        Cancelar
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/manage/ExercisePicker.tsx
git commit -m "feat: add ExercisePicker with search and inline create"
```

---

## Task 11: Create PlanEditor component

**Files:**
- Create: `src/components/manage/PlanEditor.tsx`

Shows a plan's details (name, day) and its exercise list. Each exercise shows sets/reps/rest inline-editable. Has a "+ Adicionar exercício" button that opens ExercisePicker.

- [ ] **Step 1: Create `src/components/manage/PlanEditor.tsx`**

```tsx
import { useEffect, useState } from "react";
import { getPlanExercises } from "../../lib/queries/plans";
import {
  addExerciseToPlan,
  removePlanExercise,
  updatePlan,
  updatePlanExercise,
  type Exercise,
} from "../../lib/queries/manage";
import type { DayKey, PlanExercise, WorkoutPlan } from "../../types";
import { DAY_LABELS } from "../../types";
import { ExercisePicker } from "./ExercisePicker";

interface Props {
  plan: WorkoutPlan;
  onBack: () => void;
  onChanged: () => void;
}

const DAYS: DayKey[] = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];

export function PlanEditor({ plan, onBack, onChanged }: Props) {
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(plan.name);
  const [selectedDay, setSelectedDay] = useState<DayKey>(plan.suggestedDay);
  const [showPicker, setShowPicker] = useState(false);
  const [editingExId, setEditingExId] = useState<number | null>(null);

  useEffect(() => {
    getPlanExercises(plan.id).then(setExercises);
  }, [plan.id]);

  async function handleSaveName() {
    if (nameValue.trim() === plan.name && selectedDay === plan.suggestedDay) {
      setEditingName(false);
      return;
    }
    await updatePlan(plan.id, { name: nameValue.trim(), suggestedDay: selectedDay });
    onChanged();
    setEditingName(false);
  }

  async function handleExerciseSelected(ex: Exercise) {
    setShowPicker(false);
    await addExerciseToPlan(plan.id, ex.id, { sortOrder: exercises.length });
    const updated = await getPlanExercises(plan.id);
    setExercises(updated);
    onChanged();
  }

  async function handleRemoveExercise(peId: number) {
    await removePlanExercise(peId);
    setExercises((prev) => prev.filter((e) => e.id !== peId));
    onChanged();
  }

  async function handleUpdateExercise(pe: PlanExercise, field: string, value: string) {
    const num = value === "" ? undefined : Number(value);
    const updates: Parameters<typeof updatePlanExercise>[1] = {};
    if (field === "sets") updates.sets = num;
    if (field === "repsMin") updates.repsMin = num;
    if (field === "repsMax") updates.repsMax = num;
    if (field === "restSeconds") updates.restSeconds = num;
    await updatePlanExercise(pe.id, updates);
    const updated = await getPlanExercises(plan.id);
    setExercises(updated);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back + plan name header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl cursor-pointer transition-all active:opacity-60"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Voltar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        {editingName ? (
          <div className="flex flex-col gap-2 flex-1">
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="px-3 py-2 rounded-xl text-[0.95rem] outline-none w-full"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--accent-mute)",
                color: "var(--text-primary)",
              }}
            />
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className="px-3 py-1 rounded-lg text-[0.8rem] font-medium cursor-pointer transition-all"
                  style={{
                    background: selectedDay === d ? "var(--accent-color)" : "rgba(255,255,255,0.05)",
                    color: selectedDay === d ? "#000" : "var(--text-secondary)",
                  }}
                >
                  {DAY_LABELS[d]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleSaveName}
                className="px-4 py-2 rounded-xl text-[0.85rem] font-semibold cursor-pointer"
                style={{ background: "var(--accent-color)", color: "#000" }}>
                Salvar
              </button>
              <button type="button" onClick={() => setEditingName(false)}
                className="px-4 py-2 rounded-xl text-[0.85rem] cursor-pointer"
                style={{ color: "var(--text-secondary)" }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="text-[1.1rem] font-bold" style={{ color: "var(--text-primary)" }}>
              {plan.name}
            </span>
            <span className="text-[0.75rem] px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
              {DAY_LABELS[plan.suggestedDay]}
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-40 group-hover:opacity-80" style={{ color: "var(--text-secondary)" }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex flex-col gap-2">
        {exercises.map((ex) => (
          <div
            key={ex.id}
            className="flex flex-col gap-2 p-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.9rem] font-medium" style={{ color: "var(--text-primary)" }}>
                {ex.exerciseName}
              </span>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setEditingExId(editingExId === ex.id ? null : ex.id)}
                  className="p-1.5 rounded-lg cursor-pointer transition-all active:opacity-60"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveExercise(ex.id)}
                  className="p-1.5 rounded-lg cursor-pointer transition-all active:opacity-60"
                  style={{ color: "rgba(255,80,80,0.7)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Inline params summary */}
            {editingExId !== ex.id && (
              <div className="flex gap-3 flex-wrap">
                {ex.sets && <span className="text-[0.78rem]" style={{ color: "var(--text-secondary)" }}>{ex.sets} séries</span>}
                {(ex.repsMin || ex.repsMax) && (
                  <span className="text-[0.78rem]" style={{ color: "var(--text-secondary)" }}>
                    {ex.repsMin}{ex.repsMax && ex.repsMax !== ex.repsMin ? `–${ex.repsMax}` : ""} reps
                  </span>
                )}
                {ex.restSeconds && (
                  <span className="text-[0.78rem]" style={{ color: "var(--text-secondary)" }}>
                    {ex.restSeconds >= 60 ? `${Math.floor(ex.restSeconds / 60)}min` : `${ex.restSeconds}s`} descanso
                  </span>
                )}
              </div>
            )}

            {/* Inline edit form */}
            {editingExId === ex.id && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { label: "Séries", field: "sets", value: ex.sets },
                  { label: "Reps mín", field: "repsMin", value: ex.repsMin },
                  { label: "Reps máx", field: "repsMax", value: ex.repsMax },
                  { label: "Descanso (s)", field: "restSeconds", value: ex.restSeconds },
                ].map(({ label, field, value }) => (
                  <div key={field} className="flex flex-col gap-1">
                    <label className="text-[0.72rem]" style={{ color: "var(--text-secondary)" }}>{label}</label>
                    <input
                      type="number"
                      defaultValue={value ?? ""}
                      onBlur={(e) => handleUpdateExercise(ex, field, e.target.value)}
                      className="px-3 py-2 rounded-lg text-[0.85rem] outline-none w-full"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add exercise */}
      {showPicker ? (
        <ExercisePicker
          onSelect={handleExerciseSelected}
          onCancel={() => setShowPicker(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[0.9rem] font-medium cursor-pointer transition-all active:opacity-70"
          style={{
            border: "1.5px dashed var(--accent-mute)",
            color: "var(--accent-color)",
            background: "var(--accent-soft)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Adicionar exercício
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/manage/PlanEditor.tsx
git commit -m "feat: add PlanEditor with inline exercise params and picker"
```

---

## Task 12: Create ManageScreen and PlanList

**Files:**
- Create: `src/components/manage/PlanList.tsx`
- Create: `src/components/manage/ManageScreen.tsx`

- [ ] **Step 1: Create `src/components/manage/PlanList.tsx`**

```tsx
import { useState } from "react";
import {
  createPlan,
  deletePlan,
} from "../../lib/queries/manage";
import type { DayKey, WorkoutPlan } from "../../types";
import { DAY_LABELS } from "../../types";

interface Props {
  plans: WorkoutPlan[];
  onSelectPlan: (plan: WorkoutPlan) => void;
  onChanged: () => void;
}

const DAYS: DayKey[] = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];

export function PlanList({ plans, onSelectPlan, onChanged }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDay, setNewDay] = useState<DayKey>("SEG");

  async function handleCreate() {
    if (!newName.trim()) return;
    await createPlan(newName.trim(), newDay, plans.length);
    setNewName("");
    setCreating(false);
    onChanged();
  }

  async function handleDelete(plan: WorkoutPlan) {
    if (!confirm(`Excluir "${plan.name}"? Isso remove todos os exercícios do plano.`)) return;
    await deletePlan(plan.id);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[1rem] font-bold" style={{ color: "var(--text-primary)" }}>
          Meus Treinos
        </h2>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.82rem] font-semibold cursor-pointer transition-all active:opacity-70"
            style={{ background: "var(--accent-color)", color: "#000" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo treino
          </button>
        )}
      </div>

      {creating && (
        <div
          className="flex flex-col gap-3 p-3 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <input
            autoFocus
            type="text"
            placeholder="Nome do treino (ex: Peito + Tríceps)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="px-3 py-2 rounded-xl text-[0.9rem] outline-none w-full"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--accent-mute)",
              color: "var(--text-primary)",
            }}
          />
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setNewDay(d)}
                className="px-3 py-1 rounded-lg text-[0.8rem] font-medium cursor-pointer"
                style={{
                  background: newDay === d ? "var(--accent-color)" : "rgba(255,255,255,0.05)",
                  color: newDay === d ? "#000" : "var(--text-secondary)",
                }}
              >
                {DAY_LABELS[d]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleCreate}
              className="px-4 py-2 rounded-xl text-[0.85rem] font-semibold cursor-pointer"
              style={{ background: "var(--accent-color)", color: "#000" }}>
              Criar
            </button>
            <button type="button" onClick={() => setCreating(false)}
              className="px-4 py-2 rounded-xl text-[0.85rem] cursor-pointer"
              style={{ color: "var(--text-secondary)" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {plans.length === 0 && !creating && (
        <p className="text-center py-8 text-[0.9rem]" style={{ color: "var(--text-secondary)" }}>
          Nenhum treino criado ainda.
        </p>
      )}

      {plans.map((plan) => (
        <div
          key={plan.id}
          className="flex items-center justify-between gap-3 p-3 rounded-2xl cursor-pointer transition-all active:opacity-70"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          onClick={() => onSelectPlan(plan)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onSelectPlan(plan)}
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[0.9rem] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {plan.name}
            </span>
            <span className="text-[0.78rem]" style={{ color: "var(--text-secondary)" }}>
              {DAY_LABELS[plan.suggestedDay]}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDelete(plan); }}
              className="p-2 rounded-lg cursor-pointer transition-all active:opacity-60"
              style={{ color: "rgba(255,80,80,0.6)" }}
              aria-label="Excluir treino"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
              </svg>
            </button>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--text-secondary)" }}>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/manage/ManageScreen.tsx`**

```tsx
import { useState } from "react";
import { getPlansForUser } from "../../lib/queries/plans";
import type { WorkoutPlan } from "../../types";
import { PlanEditor } from "./PlanEditor";
import { PlanList } from "./PlanList";

interface Props {
  plans: WorkoutPlan[];
  onClose: () => void;
  onChanged: () => void;
}

export function ManageScreen({ plans: initialPlans, onClose, onChanged }: Props) {
  const [plans, setPlans] = useState<WorkoutPlan[]>(initialPlans);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);

  async function handleChanged() {
    const updated = await getPlansForUser();
    setPlans(updated);
    onChanged();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--bg-color)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-[calc(1.2rem+var(--safe-top))] pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <span className="text-[1rem] font-bold" style={{ color: "var(--text-primary)" }}>
          Gerenciar
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl cursor-pointer transition-all active:opacity-60"
          style={{ color: "var(--text-secondary)" }}
          aria-label="Fechar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 mx-auto w-full max-w-150">
        {selectedPlan ? (
          <PlanEditor
            plan={selectedPlan}
            onBack={() => setSelectedPlan(null)}
            onChanged={handleChanged}
          />
        ) : (
          <PlanList
            plans={plans}
            onSelectPlan={setSelectedPlan}
            onChanged={handleChanged}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/manage/
git commit -m "feat: add ManageScreen with PlanList and PlanEditor"
```

---

## Task 13: Wire ManageScreen into WorkoutView

**Files:**
- Modify: `src/components/WorkoutView/WorkoutView.tsx`

- [ ] **Step 1: Add gear icon button to header in WorkoutView**

In `src/components/WorkoutView/WorkoutView.tsx`:

1. Add import:
```typescript
import { ManageScreen } from "../manage/ManageScreen";
```

2. Add state:
```typescript
const [manageOpen, setManageOpen] = useState(false);
```

3. In the header `<div className="flex items-center gap-3">` (where `<StreakWidget>` is), add a gear button before it:

```tsx
<button
  type="button"
  onClick={() => setManageOpen(true)}
  className="p-2 rounded-xl transition-all active:opacity-60 cursor-pointer"
  style={{ color: "var(--text-secondary)" }}
  aria-label="Gerenciar treinos"
  title="Gerenciar treinos"
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
</button>
```

4. Add ManageScreen at the bottom of the return, before closing `</div>`:
```tsx
{manageOpen && (
  <ManageScreen
    plans={plans}
    onClose={() => setManageOpen(false)}
    onChanged={triggerRefresh}
  />
)}
```

- [ ] **Step 2: Verify full flow in browser**

```bash
yarn dev
```

1. Sign in → see WorkoutView (empty if no plans yet)
2. Click gear icon → ManageScreen opens
3. Create a plan ("Peito + Tríceps", Segunda)
4. Tap the plan → PlanEditor
5. Add exercise (search/create inline)
6. Set sets/reps/rest via inline edit
7. Close manage → plan appears in WorkoutView
8. Tab for that day shows the exercises

- [ ] **Step 3: Commit**

```bash
git add src/components/WorkoutView/WorkoutView.tsx
git commit -m "feat: wire ManageScreen into WorkoutView header"
```

---

## Task 14: Final cleanup and build verification

**Files:**
- Delete: `scripts/seed.ts`, `scripts/seed-data.ts`, `scripts/migrate-localstorage.ts`
- Modify: `package.json`

- [ ] **Step 1: Remove Turso scripts**

```bash
git rm scripts/seed.ts scripts/seed-data.ts scripts/migrate-localstorage.ts
```

Remove from `package.json`:
```json
"seed": "tsx scripts/seed.ts",
"migrate": "tsx scripts/migrate-localstorage.ts"
```

Also remove `tsx` and `dotenv` from devDependencies if no longer used:
```bash
yarn remove tsx dotenv
```

- [ ] **Step 2: Run production build**

```bash
yarn build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: remove turso seed scripts, clean up unused deps"
```

---

## Verification Checklist

- [ ] Sign in with Google works end-to-end
- [ ] Sign in with Apple works end-to-end
- [ ] After sign in, user sees empty WorkoutView
- [ ] Can create a plan via ManageScreen
- [ ] Can add exercises to a plan (search existing + create new inline)
- [ ] Can edit sets/reps/rest inline in PlanEditor
- [ ] Can delete plan and exercises
- [ ] Exercises appear in WorkoutView after creating plan
- [ ] Load modal works (save weights)
- [ ] Session toggle (complete workout) works
- [ ] Streak widget updates correctly
- [ ] Dashboard chart shows load history
- [ ] Two users on different accounts see completely separate data (RLS)
- [ ] `yarn build` passes with zero TypeScript errors
