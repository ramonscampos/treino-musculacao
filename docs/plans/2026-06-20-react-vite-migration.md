# Iron Protocol — React + Vite Migration Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o Iron Protocol de uma PWA vanilla HTML/JS para React + Vite + TypeScript com Turso (SQLite serverless) como banco de dados.

**Architecture:** SPA com React + Vite. Sem React Router (app de página única com estado). Turso via `@libsql/client` chamado direto do browser com token. Dois usuários (Ramon, Andressa) com temas distintos via CSS variables, selecionados por profile picker no primeiro acesso.

**Tech Stack:** Vite 5, React 18, TypeScript, Tailwind CSS v3, @libsql/client, vite-plugin-pwa, Inter + Outfit (Google Fonts)

---

## File Map

```
treino/
  src/
    main.tsx                          # entry point
    App.tsx                           # shell: user guard + theme injection + view router
    lib/
      db.ts                           # Turso client singleton
      queries/
        plans.ts                      # getPlansForUser, getPlanExercises
        sessions.ts                   # getTodaySession, markDone
        loads.ts                      # getLastLoad, saveLoad
    types/
      index.ts                        # all TS interfaces
    hooks/
      useUser.ts                      # selected user from localStorage
      useWorkoutPlan.ts               # plans + selected day state
      useWorkoutSessions.ts           # session logging
      useLoadLogs.ts                  # load read/write
    components/
      UserSelector.tsx                # first-open profile picker
      WorkoutView/
        WorkoutView.tsx               # day tabs + exercise list
        DayTabs.tsx                   # SEG-DOM tab bar
        ExerciseCard.tsx              # single exercise row
        WorkoutSwitcher.tsx           # bottom sheet to swap today's plan
      LoadModal/
        LoadModal.tsx                 # bottom sheet: weight inputs per set
      Dashboard/
        Dashboard.tsx                 # overlay with chart + calendar
        EvolutionChart.tsx            # bar chart per exercise
        MonthCalendar.tsx             # monthly frequency calendar
      ui/
        Toast.tsx                     # toast notification
        BottomSheet.tsx               # reusable bottom sheet wrapper
    styles/
      globals.css                     # CSS variables + base styles
  public/
    icon.svg                          # Ramon icon (existing)
    icon.andressa.svg                 # Andressa icon (existing)
    manifest.json                     # Ramon manifest (existing)
    manifest.andressa.json            # Andressa manifest (existing)
  scripts/
    seed-data.ts                      # raw data (converted from config files)
    seed.ts                           # inserts seed-data into Turso
    migrate-localstorage.ts           # exports localStorage data as JSON
  schema.sql                          # full DB schema
  index.html                          # Vite entry (no manifest link — injected by App.tsx)
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
  .env.local                          # VITE_TURSO_DATABASE_URL + VITE_TURSO_AUTH_TOKEN
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/styles/globals.css`
- Create: `.env.local` (template only, no real secrets)

- [ ] Initialize Vite in existing repo (keep existing files, just add src/)

```bash
cd /Users/ramoncampos/Desktop/treino
yarn create vite . --template react-ts
# When asked about existing files: overwrite only index.html and package.json
```

- [ ] Install dependencies

```bash
yarn add @libsql/client
yarn add -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p
```

- [ ] Configure `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

- [ ] Configure `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // manifest injected dynamically per user
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
})
```

- [ ] Set up `src/styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-color: #0a0a0c;
  --card-bg: rgba(255,255,255,0.03);
  --card-border: rgba(255,255,255,0.08);
  --accent-color: #d1ff4e;
  --accent-glow: rgba(209,255,78,0.3);
  --accent-soft: rgba(209,255,78,0.06);
  --accent-mute: rgba(209,255,78,0.2);
  --text-primary: #ffffff;
  --text-secondary: #a1a1aa;
  --text-muted: #71717a;
  --success: #4eff88;
  --success-bg: rgba(78,255,136,0.1);
  --danger: #ff4e4e;
  --transition: 0.2s ease;
}

body {
  background: var(--bg-color);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  margin: 0;
  min-height: 100dvh;
}
```

- [ ] Update `index.html` — include fonts, no manifest link

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700&display=swap" />
  <title>Iron Protocol</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] Create `.env.local` template

```
VITE_TURSO_DATABASE_URL=
VITE_TURSO_AUTH_TOKEN=
```

- [ ] Verify app boots: `yarn dev` → blank white page at localhost:5173 is OK

- [ ] Commit

```bash
git add -A
git commit -m "feat: scaffold React + Vite + Tailwind + vite-plugin-pwa"
```

---

## Task 2: Turso Database Setup

- [ ] Install Turso CLI

```bash
brew install tursodatabase/tap/turso
```

- [ ] Login and create DB

```bash
turso auth login
turso db create iron-protocol
```

- [ ] Get credentials and fill `.env.local`

```bash
turso db show iron-protocol --url
# → copy to VITE_TURSO_DATABASE_URL

turso db tokens create iron-protocol
# → copy to VITE_TURSO_AUTH_TOKEN
```

- [ ] Create `src/lib/db.ts`

```ts
import { createClient } from '@libsql/client'

export const db = createClient({
  url: import.meta.env.VITE_TURSO_DATABASE_URL,
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
})
```

- [ ] Verify connection: add a temporary `db.execute('SELECT 1')` in `main.tsx` and check console. Remove after.

- [ ] Commit

```bash
git add src/lib/db.ts .env.local
git commit -m "feat: add Turso client"
```

---

## Task 3: Schema

**Files:**
- Create: `schema.sql`

- [ ] Create `schema.sql`

```sql
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
  name          TEXT NOT NULL,      -- ex: "OMBRO"
  suggested_day TEXT NOT NULL,      -- SEG|TER|QUA|QUI|SEX|SAB|DOM
  title         TEXT NOT NULL       -- ex: "SEGUNDA — OMBRO"
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
  execution_cues   TEXT,            -- JSON array string: '["cue 1","cue 2"]'
  note             TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_superset_with INTEGER REFERENCES plan_exercises(id),
  extra            TEXT             -- day-level note (ex: "Boxe à noite")
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  plan_id      INTEGER NOT NULL REFERENCES workout_plans(id),
  performed_on TEXT NOT NULL        -- YYYY-MM-DD
);

CREATE TABLE IF NOT EXISTS load_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  logged_at   TEXT NOT NULL         -- YYYY-MM-DD
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
```

- [ ] Apply schema to Turso

```bash
turso db shell iron-protocol < schema.sql
```

- [ ] Verify in shell

```bash
turso db shell iron-protocol ".tables"
# expected: exercises  load_log_sets  load_logs  plan_exercises  users  workout_plans  workout_sessions
```

- [ ] Commit

```bash
git add schema.sql
git commit -m "feat: add DB schema"
```

---

## Task 4: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] Create `src/types/index.ts`

```ts
export interface User {
  id: number
  name: string
}

export interface Exercise {
  id: number
  name: string
  description?: string
}

export interface WorkoutPlan {
  id: number
  userId: number
  name: string
  suggestedDay: DayKey
  title: string
}

export interface PlanExercise {
  id: number
  planId: number
  exerciseId: number
  exerciseName: string
  sets?: number
  repsMin?: number
  repsMax?: number
  restSeconds?: number
  muscleFocus?: string
  executionCues: string[]
  note?: string
  sortOrder: number
  isSupersetWith?: number
  extra?: string
}

export interface WorkoutSession {
  id: number
  userId: number
  planId: number
  performedOn: string // YYYY-MM-DD
}

export interface LoadLog {
  id: number
  userId: number
  exerciseId: number
  loggedAt: string // YYYY-MM-DD
  sets: LoadLogSet[]
}

export interface LoadLogSet {
  id: number
  logId: number
  setNumber: number
  weight: number
}

export type DayKey = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'

export const DAY_LABELS: Record<DayKey, string> = {
  SEG: 'Seg', TER: 'Ter', QUA: 'Qua',
  QUI: 'Qui', SEX: 'Sex', SAB: 'Sáb', DOM: 'Dom',
}

export const DAY_ORDER: DayKey[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']

// Maps JS getDay() (0=Sun) to DayKey
export const JS_DAY_TO_KEY: Record<number, DayKey> = {
  0: 'DOM', 1: 'SEG', 2: 'TER', 3: 'QUA', 4: 'QUI', 5: 'SEX', 6: 'SAB',
}

export interface UserTheme {
  accentColor: string
  accentGlow: string
  accentSoft: string
  accentMute: string
  bgColor: string
  success: string
  successBg: string
}

export const USER_THEMES: Record<string, UserTheme> = {
  Ramon: {
    accentColor: '#d1ff4e', accentGlow: 'rgba(209,255,78,0.3)',
    accentSoft: 'rgba(209,255,78,0.06)', accentMute: 'rgba(209,255,78,0.2)',
    bgColor: '#0a0a0c', success: '#4eff88', successBg: 'rgba(78,255,136,0.1)',
  },
  Andressa: {
    accentColor: '#a78bfa', accentGlow: 'rgba(167,139,250,0.3)',
    accentSoft: 'rgba(167,139,250,0.06)', accentMute: 'rgba(167,139,250,0.2)',
    bgColor: '#0f0a0c', success: '#34d399', successBg: 'rgba(52,211,153,0.1)',
  },
}
```

- [ ] Commit

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript types"
```

---

## Task 5: Seed Data Script

**Files:**
- Create: `scripts/seed-data.ts`
- Create: `scripts/seed.ts`

- [ ] Install tsx for running scripts

```bash
yarn add -D tsx
```

- [ ] Create `scripts/seed-data.ts` — raw workout data from both configs

```ts
// Parsed from config.js and config.andressa.js
// sets string → { sets, repsMin, repsMax }
// rest string → restSeconds

export function parseSets(s: string): { sets?: number; repsMin?: number; repsMax?: number } {
  // "4x6–8" | "4x10-12" | "4 séries" | "3x8–10 cada perna" | "3x10+10"
  const m = s.match(/^(\d+)x(\d+)[–\-](\d+)/)
  if (m) return { sets: +m[1], repsMin: +m[2], repsMax: +m[3] }
  const m2 = s.match(/^(\d+)\s*séries?/i)
  if (m2) return { sets: +m2[1] }
  const m3 = s.match(/^(\d+)x(\d+)/)
  if (m3) return { sets: +m3[1], repsMin: +m3[2], repsMax: +m3[2] }
  return {}
}

export function parseRest(s?: string): number | undefined {
  if (!s) return undefined
  const m = s.match(/(\d+)\s*min/i)
  if (m) return +m[1] * 60
  const m2 = s.match(/(\d+)\s*s/i)
  if (m2) return +m2[1]
  return undefined
}

export interface RawExercise {
  name: string
  sets: string
  rest?: string
  note?: string
  executionCues?: string[]
  muscleFocus?: string
  description?: string   // equipment options / general info
}

export interface RawDayData {
  title: string
  exercises: RawExercise[]
  rest?: boolean
  extra?: string
}

export const RAMON_DATA: Record<string, RawDayData> = {
  SEG: {
    title: 'SEGUNDA — LEGS (Quadríceps Prioridade)',
    exercises: [
      {
        name: 'Agachamento Livre',
        description: 'Barra livre',
        executionCues: ['Profundidade máxima sem perder lombar'],
        muscleFocus: 'Quadríceps',
        sets: '4x6–8', rest: '3min',
      },
      {
        name: 'Leg Press 45°',
        executionCues: ['Pés baixos e relativamente fechados', 'Foco em quadríceps'],
        muscleFocus: 'Quadríceps',
        sets: '4x10–12', rest: '2min',
      },
      {
        name: 'Agachamento Búlgaro',
        description: 'Halteres',
        executionCues: ['Passada curta', 'Tronco levemente ereto'],
        muscleFocus: 'Quadríceps',
        sets: '3x10–12 cada perna', rest: '2min',
      },
      {
        name: 'Cadeira Extensora',
        executionCues: ['Segurar 1 segundo no topo', 'Controlar descida'],
        muscleFocus: 'Quadríceps',
        sets: '3x12–15', rest: '90s',
        note: 'Última série drop-set opcional',
      },
    ],
  },
  TER: {
    title: 'TERÇA — PUSH (Peito Superior + Tríceps)',
    exercises: [
      {
        name: 'Supino Inclinado',
        description: 'Barra (preferencial) ou Máquina convergente inclinada',
        executionCues: ['Banco entre 30° e 40°'],
        muscleFocus: 'Peito superior',
        sets: '4x6–8', rest: '3min',
      },
      {
        name: 'Supino Reto',
        description: 'Máquina convergente (preferencial), Barra ou Halteres',
        muscleFocus: 'Peito',
        sets: '3x8–10', rest: '2min',
      },
      {
        name: 'Crucifixo no Cabo (Low-to-High)',
        description: 'Polias baixas',
        executionCues: ['Movimento subindo em direção ao rosto', 'Foco total em peito superior'],
        muscleFocus: 'Peito superior',
        sets: '3x12–15', rest: '90s',
      },
      {
        name: 'Tríceps Francês na Corda',
        description: 'Polia alta',
        executionCues: ['Braços acima da cabeça', 'Alongar bem o tríceps'],
        muscleFocus: 'Tríceps',
        sets: '4x10–12', rest: '90s',
      },
      {
        name: 'Tríceps Corda',
        description: 'Polia alta',
        executionCues: ['Abrindo a corda no final'],
        muscleFocus: 'Tríceps',
        sets: '3x12–15', rest: '90s',
      },
    ],
  },
  QUA: {
    title: 'QUARTA — PULL (Costas + Posterior)',
    exercises: [
      {
        name: 'Puxada Frontal Aberta',
        description: 'Barra longa, pegada pronada',
        executionCues: ['Pegada pronada', 'Trazer para parte superior do peito'],
        muscleFocus: 'Costas',
        sets: '4x8–10', rest: '2min',
      },
      {
        name: 'Remada Máquina Apoiada',
        description: 'Hammer, Articulada ou Iso-lateral',
        executionCues: ['Apoio no peito obrigatório'],
        muscleFocus: 'Costas',
        sets: '4x8–10', rest: '2min',
      },
      {
        name: 'Remada Unilateral',
        description: 'Halter apoiado no banco ou Máquina unilateral',
        muscleFocus: 'Costas',
        sets: '3x10–12', rest: '90s',
      },
      {
        name: 'Crucifixo Inverso',
        description: 'Máquina reverse fly ou Peck deck invertido',
        muscleFocus: 'Posterior de ombro',
        sets: '4x12–15', rest: '90s',
      },
      {
        name: 'Rosca Direta Barra W',
        executionCues: ['Pegada confortável'],
        muscleFocus: 'Bíceps',
        sets: '4x8–10', rest: '90s',
      },
      {
        name: 'Rosca Martelo',
        description: 'Halteres',
        executionCues: ['Alternada ou simultânea'],
        muscleFocus: 'Bíceps',
        sets: '3x10–12', rest: '90s',
      },
    ],
  },
  QUI: {
    title: 'QUINTA — LEGS (Posterior Prioridade)',
    exercises: [
      {
        name: 'Hack Squat',
        executionCues: ['Posição confortável', 'Sem sacrificar joelho'],
        muscleFocus: 'Quadríceps',
        sets: '4x6–8', rest: '3min',
      },
      {
        name: 'Cadeira Flexora',
        executionCues: ['Controle total'],
        muscleFocus: 'Posterior',
        sets: '4x10–12', rest: '2min',
      },
      {
        name: 'Stiff',
        description: 'Halteres ou Barra',
        executionCues: ['Alongamento máximo da posterior', 'Coluna neutra'],
        muscleFocus: 'Posterior',
        sets: '4x8–10', rest: '2min',
      },
      {
        name: 'Mesa Flexora',
        executionCues: ['Movimento completo'],
        muscleFocus: 'Posterior',
        sets: '3x10–12', rest: '90s',
      },
      {
        name: 'Adução Máquina',
        executionCues: ['Sem exagerar carga'],
        muscleFocus: 'Adutor',
        sets: '3x12–15', rest: '90s',
      },
      {
        name: 'Panturrilha Em Pé',
        description: 'Máquina específica',
        muscleFocus: 'Panturrilha',
        sets: '3x12–15', rest: '60s',
      },
    ],
  },
  SEX: {
    title: 'SEXTA — OMBRO + TRÍCEPS',
    exercises: [
      {
        name: 'Desenvolvimento',
        description: 'Máquina (preferencial) ou Halteres',
        muscleFocus: 'Ombro',
        sets: '4x6–8', rest: '3min',
      },
      {
        name: 'Elevação Lateral',
        description: 'Halteres ou Máquina',
        executionCues: ['Movimento controlado', 'Braço semi-flexionado'],
        muscleFocus: 'Ombro lateral',
        sets: '4x10–12', rest: '90s',
      },
      {
        name: 'Elevação Lateral na Polia',
        executionCues: ['Polia baixa', 'Um braço por vez'],
        muscleFocus: 'Ombro lateral',
        sets: '3x12–15', rest: '90s',
      },
      {
        name: 'Face Pull',
        executionCues: ['Polia alta', 'Corda', 'Cotovelos altos'],
        muscleFocus: 'Posterior de ombro',
        sets: '4x12–15', rest: '90s',
      },
      {
        name: 'Tríceps Francês na Corda',
        executionCues: ['Braços acima da cabeça', 'Alongar bem o tríceps'],
        muscleFocus: 'Tríceps',
        sets: '4x10–12', rest: '90s',
      },
      {
        name: 'Tríceps Barra V',
        executionCues: ['Polia alta', 'Movimento pesado'],
        muscleFocus: 'Tríceps',
        sets: '3x10–12', rest: '90s',
      },
    ],
  },
  SAB: {
    title: 'SÁBADO — UPPER (Manutenção)',
    exercises: [
      {
        name: 'Supino Inclinado',
        description: 'Barra ou máquina',
        muscleFocus: 'Peito superior',
        sets: '4x6–8', rest: '3min',
      },
      {
        name: 'Remada com Banco Inclinado',
        description: 'Halteres',
        executionCues: ['Banco a 30°–45°', 'Peito apoiado'],
        muscleFocus: 'Costas',
        sets: '4x10–12', rest: '2min',
      },
      {
        name: 'Puxada Neutra',
        executionCues: ['Triângulo ou pegadores neutros'],
        muscleFocus: 'Costas',
        sets: '3x8–10', rest: '2min',
      },
      {
        name: 'Crucifixo Inclinado',
        description: 'Halteres',
        executionCues: ['Banco 30°'],
        muscleFocus: 'Peito superior',
        sets: '3x12–15', rest: '90s',
      },
      {
        name: 'Crucifixo Inverso',
        description: 'Máquina',
        muscleFocus: 'Posterior de ombro',
        sets: '3x12–15', rest: '90s',
      },
      {
        name: 'Tríceps Corda',
        executionCues: ['Polia alta'],
        muscleFocus: 'Tríceps',
        sets: '3x12–15', rest: '90s',
      },
    ],
  },
  DOM: { title: 'DOMINGO — DESCANSO', exercises: [], rest: true },
}

export const ANDRESSA_DATA: Record<string, RawDayData> = {
  SEG: {
    title: 'SEGUNDA — OMBRO',
    exercises: [
      { name: 'Desenvolvimento com halteres', sets: '4x6–8', rest: '3min' },
      { name: 'Elevação lateral com halteres', sets: '4x10–12', rest: '90s' },
      { name: 'Elevação lateral na polia baixa', sets: '3x12–15', rest: '90s' },
      { name: 'Remada alta na polia', sets: '4x8–10', rest: '2min' },
      { name: 'Face pull', sets: '3x12–15', rest: '90s' },
    ],
  },
  TER: {
    title: 'TERÇA — GLÚTEO & POSTERIOR',
    exercises: [
      { name: 'Elevação Pélvica', sets: '4 séries', rest: '90s' },
      { name: 'Búlgaro', sets: '4x8–10', rest: '2min' },
      { name: 'Terra Sumô', sets: '4 séries', rest: '90s' },
      { name: 'Cadeira Abdutora (Tronco Inclinado)', sets: '4x12–15', rest: '60s' },
      { name: 'Abdução no Cabo', sets: '3x10+10', rest: '60s' },
    ],
  },
  QUA: { title: 'QUARTA — CARDIO', exercises: [], rest: true, extra: 'Bikezinha, esteira ou a escada do capiroto' },
  QUI: {
    title: 'QUINTA — POSTERIOR & GLÚTEO',
    exercises: [
      { name: 'Cadeira Flexora', sets: '4 séries', rest: '60s' },
      { name: 'Stiff', sets: '4 séries', rest: '90s' },
      { name: 'Mesa Flexora', sets: '3x10+10', rest: '60s' },
      { name: 'RDL', sets: '4x8–10', rest: '90s' },
      { name: 'Leg 45 Abduzido', sets: '3x10–12', rest: '2min' },
      { name: 'Cadeira Abdutora (Tronco Reto)', sets: '4x12–15', rest: '60s' },
    ],
  },
  SEX: { title: 'SEXTA — A DEFINIR', exercises: [], extra: 'Só falta esse, mô' },
  SAB: {
    title: 'SÁBADO — LEGS (Quad + Vasto Medial)',
    exercises: [
      { name: 'Agachamento livre', sets: '4x8–10', rest: '2min' },
      { name: 'Leg press pé baixo e fechado', sets: '4x10–12', rest: '2min' },
      { name: 'Afundo', sets: '3x8–10 cada perna', rest: '2min' },
      { name: 'Cadeira extensora', sets: '4x10–12', rest: '90s', note: 'última série: drop set' },
      { name: 'Panturrilha sentado', sets: '4x12–15', rest: '60s' },
    ],
  },
  DOM: { title: 'DOMINGO — DESCANSO', exercises: [], rest: true, extra: 'Descansa, mozão' },
}
```

- [ ] Create `scripts/seed.ts`

```ts
import { createClient } from '@libsql/client'
import { config } from 'dotenv'
import { RAMON_DATA, ANDRESSA_DATA, parseSets, parseRest, type RawExercise } from './seed-data'

config({ path: '.env.local' })

const db = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN!,
})

async function seed() {
  console.log('Seeding...')

  // Users
  await db.execute("INSERT OR IGNORE INTO users (name) VALUES ('Ramon')")
  await db.execute("INSERT OR IGNORE INTO users (name) VALUES ('Andressa')")

  const { rows: userRows } = await db.execute('SELECT id, name FROM users')
  const userMap = Object.fromEntries(userRows.map(r => [r.name as string, r.id as number]))

  // Collect unique exercises (name → first description found)
  const exDescriptions = new Map<string, string | undefined>()
  for (const d of [RAMON_DATA, ANDRESSA_DATA]) {
    for (const day of Object.values(d)) {
      for (const ex of day.exercises) {
        if (!exDescriptions.has(ex.name)) exDescriptions.set(ex.name, ex.description)
      }
    }
  }

  for (const [name, description] of exDescriptions) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO exercises (name, description) VALUES (?, ?)',
      args: [name, description ?? null],
    })
  }

  const { rows: exRows } = await db.execute('SELECT id, name FROM exercises')
  const exMap = Object.fromEntries(exRows.map(r => [r.name as string, r.id as number]))

  // Seed plans for each user
  async function seedUser(userName: string, data: typeof RAMON_DATA) {
    const userId = userMap[userName]

    for (const [dayKey, dayData] of Object.entries(data)) {
      const result = await db.execute({
        sql: 'INSERT INTO workout_plans (user_id, name, suggested_day, title) VALUES (?, ?, ?, ?) RETURNING id',
        args: [userId, dayData.title.split('—')[1]?.trim() ?? dayKey, dayKey, dayData.title],
      })
      const planId = result.rows[0].id as number

      for (let i = 0; i < dayData.exercises.length; i++) {
        const ex = dayData.exercises[i]
        const { sets, repsMin, repsMax } = parseSets(ex.sets)
        const restSeconds = parseRest(ex.rest)
        const exerciseId = exMap[ex.name]

        await db.execute({
          sql: `INSERT INTO plan_exercises
                  (plan_id, exercise_id, sets, reps_min, reps_max, rest_seconds,
                   muscle_focus, execution_cues, note, sort_order, extra)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            planId, exerciseId,
            sets ?? null, repsMin ?? null, repsMax ?? null,
            restSeconds ?? null,
            ex.muscleFocus ?? null,
            ex.executionCues ? JSON.stringify(ex.executionCues) : null,
            ex.note ?? null,
            i,
            dayData.extra ?? null,
          ],
        })
      }
    }
  }

  await seedUser('Ramon', RAMON_DATA)
  await seedUser('Andressa', ANDRESSA_DATA)

  console.log('Done.')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
```

- [ ] Add seed script to `package.json`

```json
"scripts": {
  "seed": "tsx scripts/seed.ts"
}
```

- [ ] Install dotenv

```bash
yarn add -D dotenv
```

- [ ] Run seed

```bash
yarn seed
```

Expected output: `Seeding... Done.`

- [ ] Verify in Turso shell

```bash
turso db shell iron-protocol "SELECT name FROM exercises LIMIT 5"
turso db shell iron-protocol "SELECT title FROM workout_plans WHERE user_id = 1"
```

- [ ] Commit

```bash
git add scripts/ package.json
git commit -m "feat: add seed scripts for Turso"
```

---

## Task 6: Query Layer

**Files:**
- Create: `src/lib/queries/plans.ts`
- Create: `src/lib/queries/sessions.ts`
- Create: `src/lib/queries/loads.ts`

- [ ] Create `src/lib/queries/plans.ts`

```ts
import { db } from '../db'
import type { WorkoutPlan, PlanExercise } from '../../types'

export async function getPlansForUser(userId: number): Promise<WorkoutPlan[]> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM workout_plans WHERE user_id = ? ORDER BY suggested_day',
    args: [userId],
  })
  return rows.map(r => ({
    id: r.id as number,
    userId: r.user_id as number,
    name: r.name as string,
    suggestedDay: r.suggested_day as WorkoutPlan['suggestedDay'],
    title: r.title as string,
  }))
}

export async function getPlanExercises(planId: number): Promise<PlanExercise[]> {
  const { rows } = await db.execute({
    sql: `SELECT pe.*, e.name AS exercise_name
          FROM plan_exercises pe
          JOIN exercises e ON e.id = pe.exercise_id
          WHERE pe.plan_id = ?
          ORDER BY pe.sort_order`,
    args: [planId],
  })
  return rows.map(r => ({
    id: r.id as number,
    planId: r.plan_id as number,
    exerciseId: r.exercise_id as number,
    exerciseName: r.exercise_name as string,
    sets: r.sets as number | undefined,
    repsMin: r.reps_min as number | undefined,
    repsMax: r.reps_max as number | undefined,
    restSeconds: r.rest_seconds as number | undefined,
    muscleFocus: r.muscle_focus as string | undefined,
    executionCues: r.execution_cues ? JSON.parse(r.execution_cues as string) : [],
    note: r.note as string | undefined,
    sortOrder: r.sort_order as number,
    isSupersetWith: r.is_superset_with as number | undefined,
    extra: r.extra as string | undefined,
  }))
}
```

- [ ] Create `src/lib/queries/sessions.ts`

```ts
import { db } from '../db'
import type { WorkoutSession } from '../../types'

export async function getSessionForDate(userId: number, date: string): Promise<WorkoutSession | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM workout_sessions WHERE user_id = ? AND performed_on = ?',
    args: [userId, date],
  })
  if (!rows[0]) return null
  const r = rows[0]
  return { id: r.id as number, userId: r.user_id as number, planId: r.plan_id as number, performedOn: r.performed_on as string }
}

export async function upsertSession(userId: number, planId: number, date: string): Promise<void> {
  await db.execute({
    sql: `INSERT INTO workout_sessions (user_id, plan_id, performed_on) VALUES (?, ?, ?)
          ON CONFLICT (user_id, performed_on) DO UPDATE SET plan_id = excluded.plan_id`,
    args: [userId, planId, date],
  })
}

export async function getSessionsInRange(userId: number, from: string, to: string): Promise<WorkoutSession[]> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM workout_sessions WHERE user_id = ? AND performed_on BETWEEN ? AND ? ORDER BY performed_on',
    args: [userId, from, to],
  })
  return rows.map(r => ({
    id: r.id as number, userId: r.user_id as number,
    planId: r.plan_id as number, performedOn: r.performed_on as string,
  }))
}
```

- [ ] Create `src/lib/queries/loads.ts`

```ts
import { db } from '../db'
import type { LoadLog } from '../../types'

export async function getLoadForDate(userId: number, exerciseId: number, date: string): Promise<LoadLog | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM load_logs WHERE user_id = ? AND exercise_id = ? AND logged_at = ?',
    args: [userId, exerciseId, date],
  })
  if (!rows[0]) return null
  return fetchLoadWithSets(rows[0])
}

export async function getLastLoad(userId: number, exerciseId: number): Promise<LoadLog | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM load_logs WHERE user_id = ? AND exercise_id = ? ORDER BY logged_at DESC LIMIT 1',
    args: [userId, exerciseId],
  })
  if (!rows[0]) return null
  return fetchLoadWithSets(rows[0])
}

async function fetchLoadWithSets(logRow: Record<string, unknown>): Promise<LoadLog> {
  const { rows: setRows } = await db.execute({
    sql: 'SELECT * FROM load_log_sets WHERE log_id = ? ORDER BY set_number',
    args: [logRow.id as number],
  })
  return {
    id: logRow.id as number,
    userId: logRow.user_id as number,
    exerciseId: logRow.exercise_id as number,
    loggedAt: logRow.logged_at as string,
    sets: setRows.map(s => ({
      id: s.id as number,
      logId: s.log_id as number,
      setNumber: s.set_number as number,
      weight: s.weight as number,
    })),
  }
}

export async function upsertLoad(userId: number, exerciseId: number, date: string, weights: number[]): Promise<void> {
  // Upsert the log entry
  await db.execute({
    sql: `INSERT INTO load_logs (user_id, exercise_id, logged_at) VALUES (?, ?, ?)
          ON CONFLICT (user_id, exercise_id, logged_at) DO NOTHING`,
    args: [userId, exerciseId, date],
  })
  const { rows } = await db.execute({
    sql: 'SELECT id FROM load_logs WHERE user_id = ? AND exercise_id = ? AND logged_at = ?',
    args: [userId, exerciseId, date],
  })
  const logId = rows[0].id as number

  // Delete existing sets and re-insert
  await db.execute({ sql: 'DELETE FROM load_log_sets WHERE log_id = ?', args: [logId] })
  for (let i = 0; i < weights.length; i++) {
    await db.execute({
      sql: 'INSERT INTO load_log_sets (log_id, set_number, weight) VALUES (?, ?, ?)',
      args: [logId, i + 1, weights[i]],
    })
  }
}

export async function getAllLoadsForExercise(userId: number, exerciseId: number): Promise<LoadLog[]> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM load_logs WHERE user_id = ? AND exercise_id = ? ORDER BY logged_at',
    args: [userId, exerciseId],
  })
  return Promise.all(rows.map(fetchLoadWithSets))
}
```

- [ ] Commit

```bash
git add src/lib/queries/
git commit -m "feat: add query layer for plans, sessions, loads"
```

---

## Task 7: useUser Hook + UserSelector

**Files:**
- Create: `src/hooks/useUser.ts`
- Create: `src/components/UserSelector.tsx`

- [ ] Create `src/hooks/useUser.ts`

```ts
import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import type { User } from '../types'

const STORAGE_KEY = 'iron_user_id'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { rows } = await db.execute('SELECT id, name FROM users ORDER BY id')
      const allUsers = rows.map(r => ({ id: r.id as number, name: r.name as string }))
      setUsers(allUsers)

      const savedId = localStorage.getItem(STORAGE_KEY)
      if (savedId) {
        const found = allUsers.find(u => u.id === +savedId)
        if (found) setUser(found)
      }
      setLoading(false)
    }
    init()
  }, [])

  function selectUser(u: User) {
    localStorage.setItem(STORAGE_KEY, String(u.id))
    setUser(u)
  }

  return { user, users, loading, selectUser }
}
```

- [ ] Create `src/components/UserSelector.tsx`

```tsx
import type { User } from '../types'
import { USER_THEMES } from '../types'

interface Props {
  users: User[]
  onSelect: (user: User) => void
}

export function UserSelector({ users, onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-8 p-6">
      <div className="text-center">
        <p className="text-xs tracking-widest text-[var(--text-muted)] uppercase mb-2">Iron Protocol</p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Quem vai treinar?</h1>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {users.map(u => {
          const theme = USER_THEMES[u.name]
          return (
            <button
              key={u.id}
              onClick={() => onSelect(u)}
              className="w-full py-4 rounded-xl font-semibold text-base transition-all active:scale-95"
              style={{
                background: theme?.accentSoft ?? 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${theme?.accentMute ?? 'rgba(255,255,255,0.1)'}`,
                color: theme?.accentColor ?? '#fff',
              }}
            >
              {u.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] Commit

```bash
git add src/hooks/useUser.ts src/components/UserSelector.tsx
git commit -m "feat: user selection with localStorage persistence"
```

---

## Task 8: App Shell + Theme Injection

**Files:**
- Create: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] Create `src/App.tsx`

```tsx
import { useEffect } from 'react'
import { useUser } from './hooks/useUser'
import { UserSelector } from './components/UserSelector'
import { USER_THEMES } from './types'

export function App() {
  const { user, users, loading, selectUser } = useUser()

  // Inject theme CSS variables and PWA meta tags
  useEffect(() => {
    if (!user) return
    const theme = USER_THEMES[user.name]
    if (!theme) return

    const root = document.documentElement
    root.style.setProperty('--accent-color', theme.accentColor)
    root.style.setProperty('--accent-glow', theme.accentGlow)
    root.style.setProperty('--accent-soft', theme.accentSoft)
    root.style.setProperty('--accent-mute', theme.accentMute)
    root.style.setProperty('--bg-color', theme.bgColor)
    root.style.setProperty('--success', theme.success)
    root.style.setProperty('--success-bg', theme.successBg)

    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bgColor)

    const manifestId = 'pwa-manifest-link'
    let link = document.getElementById(manifestId) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = manifestId
      link.rel = 'manifest'
      document.head.appendChild(link)
    }
    link.href = user.name === 'Andressa' ? '/manifest.andressa.json' : '/manifest.json'

    document.title = user.name === 'Andressa' ? 'Protocolo Gostosa 2.0' : 'Iron Protocol'
  }, [user])

  if (loading) return <div className="min-h-dvh bg-[var(--bg-color)]" />

  if (!user) return <UserSelector users={users} onSelect={selectUser} />

  // Main app — WorkoutView will be added in next task
  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)]">
      <p className="p-8 text-center text-[var(--text-muted)]">Olá, {user.name}</p>
    </div>
  )
}
```

- [ ] Update `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] Verify: `yarn dev` → UserSelector aparece, selecionar usuário muda o tema e persiste após reload

- [ ] Commit

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: app shell with theme injection and user guard"
```

---

## Task 9: useWorkoutPlan Hook + WorkoutView + DayTabs

**Files:**
- Create: `src/hooks/useWorkoutPlan.ts`
- Create: `src/components/WorkoutView/WorkoutView.tsx`
- Create: `src/components/WorkoutView/DayTabs.tsx`

- [ ] Create `src/hooks/useWorkoutPlan.ts`

```ts
import { useState, useEffect } from 'react'
import { getPlansForUser, getPlanExercises } from '../lib/queries/plans'
import { getSessionForDate } from '../lib/queries/sessions'
import { JS_DAY_TO_KEY, type DayKey, type WorkoutPlan, type PlanExercise } from '../types'

export function todayKey(): DayKey {
  return JS_DAY_TO_KEY[new Date().getDay()]
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useWorkoutPlan(userId: number) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [selectedDay, setSelectedDay] = useState<DayKey>(todayKey())
  const [overridePlanId, setOverridePlanId] = useState<number | null>(null)
  const [exercises, setExercises] = useState<PlanExercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPlansForUser(userId).then(setPlans)
  }, [userId])

  // Resolve active plan: override > today's session > suggested day
  const activePlan = overridePlanId
    ? plans.find(p => p.id === overridePlanId)
    : plans.find(p => p.suggestedDay === selectedDay)

  useEffect(() => {
    if (!activePlan) { setExercises([]); setLoading(false); return }
    setLoading(true)
    getPlanExercises(activePlan.id).then(ex => { setExercises(ex); setLoading(false) })
  }, [activePlan?.id])

  // Check if today's session exists (which plan was actually done today)
  useEffect(() => {
    if (selectedDay !== todayKey()) { setOverridePlanId(null); return }
    getSessionForDate(userId, todayStr()).then(s => {
      if (s) setOverridePlanId(s.planId)
    })
  }, [userId, selectedDay])

  return {
    plans, selectedDay, setSelectedDay,
    activePlan, overridePlanId, setOverridePlanId,
    exercises, loading,
  }
}
```

- [ ] Create `src/components/WorkoutView/DayTabs.tsx`

```tsx
import { DAY_LABELS, DAY_ORDER, type DayKey } from '../../types'

interface Props {
  selected: DayKey
  onSelect: (day: DayKey) => void
  todayKey: DayKey
}

export function DayTabs({ selected, onSelect, todayKey }: Props) {
  return (
    <div className="flex overflow-x-auto gap-2 px-4 py-3 no-scrollbar">
      {DAY_ORDER.map(day => {
        const isSelected = day === selected
        const isToday = day === todayKey
        return (
          <button
            key={day}
            onClick={() => onSelect(day)}
            className="flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
            style={isSelected
              ? { background: 'var(--accent-color)', color: '#0a0a0c' }
              : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: isToday ? 'var(--accent-color)' : 'var(--text-secondary)' }
            }
          >
            {DAY_LABELS[day]}
            {isToday && !isSelected && (
              <span className="block w-1 h-1 rounded-full mx-auto mt-0.5 bg-[var(--accent-color)]" />
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] Create `src/components/WorkoutView/WorkoutView.tsx` (skeleton, exercises in next task)

```tsx
import { useWorkoutPlan, todayKey } from '../../hooks/useWorkoutPlan'
import { DayTabs } from './DayTabs'

interface Props { userId: number }

export function WorkoutView({ userId }: Props) {
  const { plans, selectedDay, setSelectedDay, activePlan, exercises, loading } = useWorkoutPlan(userId)

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-12 pb-2">
        <div>
          <p className="text-xs tracking-widest text-[var(--accent-color)] uppercase font-bold">Iron Protocol</p>
          <h1 className="text-2xl font-bold">{activePlan?.title ?? 'Carregando...'}</h1>
        </div>
      </header>

      <DayTabs selected={selectedDay} onSelect={setSelectedDay} todayKey={todayKey()} />

      <main className="flex-1 px-4 pb-8 space-y-3">
        {loading && <p className="text-[var(--text-muted)] text-sm py-4">Carregando...</p>}
        {!loading && exercises.length === 0 && (
          <p className="text-[var(--text-muted)] text-sm py-8 text-center">Descanso. Aproveite!</p>
        )}
        {exercises.map(ex => (
          <div key={ex.id} className="p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <p className="font-semibold text-[var(--text-primary)]">{ex.exerciseName}</p>
            <p className="text-sm text-[var(--text-secondary)]">{ex.sets && `${ex.sets}x`}{ex.repsMin}{ex.repsMax && ex.repsMax !== ex.repsMin ? `–${ex.repsMax}` : ''}</p>
          </div>
        ))}
      </main>
    </div>
  )
}
```

- [ ] Wire WorkoutView into App.tsx (replace placeholder `<p>`)

```tsx
// In App.tsx, replace the placeholder return with:
import { WorkoutView } from './components/WorkoutView/WorkoutView'
// ...
return <WorkoutView userId={user.id} />
```

- [ ] Verify: app shows day tabs, exercises load per day, today's tab is highlighted

- [ ] Commit

```bash
git add src/hooks/useWorkoutPlan.ts src/components/WorkoutView/
git commit -m "feat: workout view with day tabs and exercise list"
```

---

## Task 10: ExerciseCard

**Files:**
- Create: `src/components/WorkoutView/ExerciseCard.tsx`
- Modify: `src/components/WorkoutView/WorkoutView.tsx`

- [ ] Create `src/components/WorkoutView/ExerciseCard.tsx`

```tsx
import type { PlanExercise } from '../../types'

interface Props {
  exercise: PlanExercise
  lastWeights: number[]        // from last load_log
  onOpenLoad: () => void
  isSupersetPair?: boolean
}

function formatSets(ex: PlanExercise): string {
  if (!ex.sets) return ''
  const reps = ex.repsMin
    ? ex.repsMax && ex.repsMax !== ex.repsMin
      ? `${ex.repsMin}–${ex.repsMax}`
      : String(ex.repsMin)
    : ''
  return reps ? `${ex.sets}x${reps}` : `${ex.sets} séries`
}

function formatRest(seconds?: number): string {
  if (!seconds) return ''
  return seconds >= 60 ? `${seconds / 60}min` : `${seconds}s`
}

function formatWeights(weights: number[]): string {
  if (weights.length === 0) return ''
  const unique = [...new Set(weights)]
  return unique.length === 1 ? `${unique[0]}kg` : weights.map(w => w || '—').join('/')
}

export function ExerciseCard({ exercise: ex, lastWeights, onOpenLoad, isSupersetPair }: Props) {
  const hasLoad = lastWeights.length > 0 && lastWeights.some(w => w > 0)

  return (
    <div
      className="p-4 rounded-xl transition-all active:scale-[0.99]"
      style={{ background: 'var(--card-bg)', border: `1px solid ${isSupersetPair ? 'var(--accent-mute)' : 'var(--card-border)'}` }}
    >
      {/* Name + load chip */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-[var(--text-primary)] leading-snug flex-1">{ex.exerciseName}</p>
        <button
          onClick={onOpenLoad}
          className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold transition-all active:scale-95"
          style={hasLoad
            ? { background: 'var(--accent-soft)', color: 'var(--accent-color)', border: '1px solid var(--accent-mute)' }
            : { background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }
          }
        >
          {hasLoad ? formatWeights(lastWeights) : '+ carga'}
        </button>
      </div>

      {/* muscle focus */}
      {ex.muscleFocus && (
        <p className="text-xs text-[var(--accent-color)] mt-1 font-medium">{ex.muscleFocus}</p>
      )}

      {/* sets + rest */}
      <div className="flex items-center gap-3 mt-2">
        <span className="text-sm text-[var(--text-secondary)]">{formatSets(ex)}</span>
        {ex.restSeconds && (
          <span className="text-xs text-[var(--text-muted)]">Descanso: {formatRest(ex.restSeconds)}</span>
        )}
      </div>

      {/* execution cues */}
      {ex.executionCues.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {ex.executionCues.map((cue, i) => (
            <li key={i} className="text-xs text-[var(--text-muted)] flex gap-1.5">
              <span className="text-[var(--accent-mute)]">•</span>
              {cue}
            </li>
          ))}
        </ul>
      )}

      {/* note */}
      {ex.note && (
        <p className="text-xs text-[var(--text-muted)] mt-2 italic">{ex.note}</p>
      )}

      {/* superset indicator */}
      {ex.isSupersetWith && (
        <p className="text-xs text-[var(--accent-color)] mt-2">superset ↓</p>
      )}
    </div>
  )
}
```

- [ ] Update `WorkoutView.tsx` to use ExerciseCard and wire load state

```tsx
// Add to WorkoutView.tsx:
// - Import ExerciseCard
// - State: lastWeightsMap: Record<number, number[]> (exerciseId → weights)
// - useEffect: load last weights for all exercises when exercises change
// - State: loadModalExercise: PlanExercise | null
// - Render ExerciseCard with onOpenLoad={() => setLoadModalExercise(ex)}
// - Load modal placeholder: {loadModalExercise && <p>Modal for {loadModalExercise.exerciseName}</p>}
```

Full updated `WorkoutView.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useWorkoutPlan, todayKey, todayStr } from '../../hooks/useWorkoutPlan'
import { getLastLoad } from '../../lib/queries/loads'
import { DayTabs } from './DayTabs'
import { ExerciseCard } from './ExerciseCard'
import type { PlanExercise } from '../../types'

interface Props { userId: number }

export function WorkoutView({ userId }: Props) {
  const { plans, selectedDay, setSelectedDay, activePlan, exercises, loading } = useWorkoutPlan(userId)
  const [weightsMap, setWeightsMap] = useState<Record<number, number[]>>({})
  const [loadModalEx, setLoadModalEx] = useState<PlanExercise | null>(null)

  useEffect(() => {
    if (exercises.length === 0) return
    Promise.all(
      exercises.map(ex =>
        getLastLoad(userId, ex.exerciseId).then(log => ({
          exerciseId: ex.exerciseId,
          weights: log?.sets.map(s => s.weight) ?? [],
        }))
      )
    ).then(results => {
      const map: Record<number, number[]> = {}
      results.forEach(r => { map[r.exerciseId] = r.weights })
      setWeightsMap(map)
    })
  }, [userId, exercises])

  const supersetPairs = new Set(exercises.filter(e => e.isSupersetWith).map(e => e.isSupersetWith!))

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="flex items-center justify-between px-4 pt-12 pb-2">
        <div>
          <p className="text-xs tracking-widest text-[var(--accent-color)] uppercase font-bold">Iron Protocol</p>
          <h1 className="text-xl font-bold leading-tight">{activePlan?.title ?? ''}</h1>
        </div>
      </header>

      <DayTabs selected={selectedDay} onSelect={setSelectedDay} todayKey={todayKey()} />

      <main className="flex-1 px-4 pb-24 space-y-3">
        {loading && <p className="text-[var(--text-muted)] text-sm py-4">Carregando...</p>}
        {!loading && exercises.length === 0 && (
          <p className="text-[var(--text-muted)] text-sm py-12 text-center">Descanso. Aproveite!</p>
        )}
        {exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            lastWeights={weightsMap[ex.exerciseId] ?? []}
            onOpenLoad={() => setLoadModalEx(ex)}
            isSupersetPair={supersetPairs.has(ex.id)}
          />
        ))}
      </main>

      {/* LoadModal placeholder — will be built in Task 13 */}
      {loadModalEx && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setLoadModalEx(null)}>
          <div className="w-full p-6 rounded-t-2xl" style={{ background: '#1a1a1f' }} onClick={e => e.stopPropagation()}>
            <p className="text-[var(--text-primary)] font-semibold">{loadModalEx.exerciseName}</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">Modal em breve...</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] Add `no-scrollbar` utility to `globals.css`

```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

- [ ] Verify: cards render correctly, load chip appears, tapping opens placeholder

- [ ] Commit

```bash
git add src/components/WorkoutView/ExerciseCard.tsx src/components/WorkoutView/WorkoutView.tsx
git commit -m "feat: exercise card with sets, cues, load chip"
```

---

## Task 11: WorkoutSwitcher + Mark as Done

**Files:**
- Create: `src/components/WorkoutView/WorkoutSwitcher.tsx`
- Create: `src/components/ui/BottomSheet.tsx`
- Modify: `src/components/WorkoutView/WorkoutView.tsx`

- [ ] Create `src/components/ui/BottomSheet.tsx`

```tsx
import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function BottomSheet({ open, onClose, children, title }: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl p-6 max-h-[85dvh] overflow-y-auto"
        style={{ background: '#16161a', border: '1px solid var(--card-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--card-border)' }} />
        {title && <p className="text-[var(--text-primary)] font-semibold text-base mb-4">{title}</p>}
        {children}
      </div>
    </div>
  )
}
```

- [ ] Create `src/components/WorkoutView/WorkoutSwitcher.tsx`

```tsx
import { BottomSheet } from '../ui/BottomSheet'
import type { WorkoutPlan } from '../../types'

interface Props {
  open: boolean
  onClose: () => void
  plans: WorkoutPlan[]
  activePlanId?: number
  onSelect: (planId: number) => void
}

export function WorkoutSwitcher({ open, onClose, plans, activePlanId, onSelect }: Props) {
  const DAY_PT: Record<string, string> = {
    SEG: 'Seg', TER: 'Ter', QUA: 'Qua', QUI: 'Qui', SEX: 'Sex', SAB: 'Sáb', DOM: 'Dom',
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Qual treino vai fazer hoje?">
      <div className="space-y-2">
        {plans.map(plan => {
          const isActive = plan.id === activePlanId
          return (
            <button
              key={plan.id}
              onClick={() => { onSelect(plan.id); onClose() }}
              className="w-full text-left px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
              style={isActive
                ? { background: 'var(--accent-soft)', border: '1px solid var(--accent-mute)', color: 'var(--accent-color)' }
                : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }
              }
            >
              <span className="text-xs text-[var(--text-muted)] block">{DAY_PT[plan.suggestedDay]}</span>
              <span className="font-medium">{plan.name}</span>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
```

- [ ] Update `WorkoutView.tsx` — add switcher + mark as done button

Add to WorkoutView (in header area and bottom button):

```tsx
// Additional state:
const [switcherOpen, setSwitcherOpen] = useState(false)
const [sessionDone, setSessionDone] = useState(false)

// Check if today is already done on mount
useEffect(() => {
  if (selectedDay !== todayKey()) { setSessionDone(false); return }
  getSessionForDate(userId, todayStr()).then(s => setSessionDone(!!s))
}, [userId, selectedDay])

// handleMarkDone
async function handleMarkDone() {
  if (!activePlan) return
  await upsertSession(userId, activePlan.id, todayStr())
  setSessionDone(true)
}

// handleSwitchPlan
function handleSwitchPlan(planId: number) {
  setOverridePlanId(planId)
}
```

Add in JSX (after `</main>`, before `{loadModalEx && ...}`):

```tsx
{/* Bottom action bar */}
<div className="fixed bottom-0 left-0 right-0 p-4 flex gap-3"
  style={{ background: 'linear-gradient(to top, var(--bg-color) 70%, transparent)' }}>
  {selectedDay === todayKey() && (
    <>
      <button
        onClick={() => setSwitcherOpen(true)}
        className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
      >
        Trocar treino
      </button>
      <button
        onClick={handleMarkDone}
        disabled={sessionDone}
        className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60"
        style={sessionDone
          ? { background: 'var(--success-bg)', border: '1px solid var(--success)', color: 'var(--success)' }
          : { background: 'var(--accent-color)', color: '#0a0a0c' }
        }
      >
        {sessionDone ? 'Feito!' : 'Marcar feito'}
      </button>
    </>
  )}
</div>

<WorkoutSwitcher
  open={switcherOpen}
  onClose={() => setSwitcherOpen(false)}
  plans={plans}
  activePlanId={activePlan?.id}
  onSelect={handleSwitchPlan}
/>
```

- [ ] Import `upsertSession` and `getSessionForDate` in WorkoutView

- [ ] Verify: "Trocar treino" opens switcher, selecting another plan loads its exercises, "Marcar feito" persists

- [ ] Commit

```bash
git add src/components/WorkoutView/WorkoutSwitcher.tsx src/components/ui/BottomSheet.tsx src/components/WorkoutView/WorkoutView.tsx
git commit -m "feat: workout switcher and mark as done"
```

---

## Task 12: LoadModal

**Files:**
- Create: `src/components/LoadModal/LoadModal.tsx`
- Create: `src/hooks/useLoadLogs.ts`
- Modify: `src/components/WorkoutView/WorkoutView.tsx`

- [ ] Create `src/hooks/useLoadLogs.ts`

```ts
import { useState, useCallback } from 'react'
import { getLoadForDate, getLastLoad, upsertLoad } from '../lib/queries/loads'
import { todayStr } from './useWorkoutPlan'

export function useLoadLogs(userId: number) {
  const [saving, setSaving] = useState(false)

  const saveLoad = useCallback(async (exerciseId: number, weights: number[]) => {
    setSaving(true)
    try {
      await upsertLoad(userId, exerciseId, todayStr(), weights)
    } finally {
      setSaving(false)
    }
  }, [userId])

  const getTodayLoad = useCallback((exerciseId: number) =>
    getLoadForDate(userId, exerciseId, todayStr()), [userId])

  const getLastLoggedLoad = useCallback((exerciseId: number) =>
    getLastLoad(userId, exerciseId), [userId])

  return { saveLoad, getTodayLoad, getLastLoggedLoad, saving }
}
```

- [ ] Create `src/components/LoadModal/LoadModal.tsx`

```tsx
import { useState, useEffect } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import type { PlanExercise } from '../../types'

interface Props {
  exercise: PlanExercise | null
  userId: number
  onClose: () => void
  onSaved: (exerciseId: number, weights: number[]) => void
  getLastLoad: (exerciseId: number) => Promise<{ sets: { weight: number }[] } | null>
  saveLoad: (exerciseId: number, weights: number[]) => Promise<void>
}

export function LoadModal({ exercise, userId, onClose, onSaved, getLastLoad, saveLoad }: Props) {
  const [weights, setWeights] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!exercise) return
    getLastLoad(exercise.exerciseId).then(log => {
      const count = exercise.sets ?? 3
      if (log && log.sets.length > 0) {
        // Pre-fill with last session's weights, padded/trimmed to current set count
        const vals = Array.from({ length: count }, (_, i) =>
          String(log.sets[i]?.weight ?? log.sets[log.sets.length - 1]?.weight ?? '')
        )
        setWeights(vals)
      } else {
        setWeights(Array(count).fill(''))
      }
    })
  }, [exercise?.id])

  async function handleSave() {
    if (!exercise) return
    const parsed = weights.map(w => parseFloat(w) || 0)
    setSaving(true)
    await saveLoad(exercise.exerciseId, parsed)
    onSaved(exercise.exerciseId, parsed)
    setSaving(false)
    onClose()
  }

  const setCount = exercise?.sets ?? 3

  return (
    <BottomSheet open={!!exercise} onClose={onClose} title={exercise?.exerciseName ?? ''}>
      {exercise && (
        <>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            {setCount} {setCount === 1 ? 'série' : 'séries'} — informe o peso (kg) de cada uma
          </p>
          <div className="space-y-3 mb-6">
            {Array.from({ length: setCount }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)] w-12">Série {i + 1}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={weights[i] ?? ''}
                  onChange={e => {
                    const next = [...weights]
                    next[i] = e.target.value
                    setWeights(next)
                  }}
                  className="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-mute)]"
                />
                <span className="text-xs text-[var(--text-muted)]">kg</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-60 transition-all active:scale-95"
            style={{ background: 'var(--accent-color)', color: '#0a0a0c' }}
          >
            {saving ? 'Salvando...' : 'Salvar Cargas'}
          </button>
        </>
      )}
    </BottomSheet>
  )
}
```

- [ ] Update `WorkoutView.tsx` — replace placeholder modal with LoadModal

```tsx
// Remove placeholder modal div, add:
import { LoadModal } from '../LoadModal/LoadModal'
import { useLoadLogs } from '../../hooks/useLoadLogs'

// In component:
const { saveLoad, getLastLoggedLoad } = useLoadLogs(userId)

function handleLoadSaved(exerciseId: number, weights: number[]) {
  setWeightsMap(prev => ({ ...prev, [exerciseId]: weights }))
}

// In JSX, replace placeholder modal with:
<LoadModal
  exercise={loadModalEx}
  userId={userId}
  onClose={() => setLoadModalEx(null)}
  onSaved={handleLoadSaved}
  getLastLoad={getLastLoggedLoad}
  saveLoad={saveLoad}
/>
```

- [ ] Verify: tapping "+ carga" opens modal, inputs pre-fill from last log, saving updates chip immediately

- [ ] Commit

```bash
git add src/components/LoadModal/ src/hooks/useLoadLogs.ts src/components/WorkoutView/WorkoutView.tsx
git commit -m "feat: load modal with per-set weight inputs and persistence"
```

---

## Task 13: Dashboard

**Files:**
- Create: `src/components/Dashboard/Dashboard.tsx`
- Create: `src/components/Dashboard/EvolutionChart.tsx`
- Create: `src/components/Dashboard/MonthCalendar.tsx`
- Modify: `src/components/WorkoutView/WorkoutView.tsx` (add dashboard button)

- [ ] Create `src/components/Dashboard/EvolutionChart.tsx`

```tsx
import { useState, useEffect } from 'react'
import { getAllLoadsForExercise } from '../../lib/queries/loads'
import type { LoadLog } from '../../types'

interface Props { userId: number; exerciseId: number; exerciseName: string }

export function EvolutionChart({ userId, exerciseId, exerciseName }: Props) {
  const [logs, setLogs] = useState<LoadLog[]>([])

  useEffect(() => {
    getAllLoadsForExercise(userId, exerciseId).then(setLogs)
  }, [userId, exerciseId])

  if (logs.length < 2) return null

  const last5 = logs.slice(-5)
  const getAvg = (log: LoadLog) => {
    if (log.sets.length === 0) return 0
    return Math.round(log.sets.reduce((s, set) => s + set.weight, 0) / log.sets.length)
  }
  const getLabel = (log: LoadLog) =>
    log.sets.length > 1 ? log.sets.map(s => s.weight).join('/') : String(log.sets[0]?.weight ?? 0)

  const maxVal = Math.max(...last5.map(getAvg), 1)

  return (
    <div className="mb-4">
      <p className="text-xs text-[var(--text-secondary)] font-semibold text-center mb-3">{exerciseName}</p>
      <div className="flex items-end justify-center gap-3" style={{ height: 54 }}>
        {last5.map((log, i) => {
          const avg = getAvg(log)
          const h = Math.max(4, Math.round((avg / maxVal) * 38))
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-[var(--text-muted)]">{getLabel(log)}</span>
              <div
                className="w-6 rounded-sm"
                style={{ height: h, background: 'var(--accent-color)', opacity: i === last5.length - 1 ? 1 : 0.4 }}
              />
              <span className="text-[9px] text-[var(--text-muted)]">{log.loggedAt.slice(5)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] Create `src/components/Dashboard/MonthCalendar.tsx`

```tsx
import type { WorkoutSession } from '../../types'

interface Props {
  sessions: WorkoutSession[]
  month: number  // 0-based
  year: number
  onPrev: () => void
  onNext: () => void
}

const PT_MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export function MonthCalendar({ sessions, month, year, onPrev, onNext }: Props) {
  const doneDates = new Set(sessions.map(s => s.performedOn))
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = new Date().toISOString().slice(0, 10)

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="text-[var(--text-muted)] px-2 text-lg">‹</button>
        <p className="text-sm font-semibold text-[var(--text-secondary)]">{PT_MONTHS[month]} {year}</p>
        <button onClick={onNext} className="text-[var(--text-muted)] px-2 text-lg">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <p key={i} className="text-center text-[9px] text-[var(--text-muted)] font-semibold pb-1">{d}</p>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isDone = doneDates.has(dateStr)
          const isToday = dateStr === todayStr
          return (
            <div
              key={i}
              className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium"
              style={isDone
                ? { background: 'var(--accent-soft)', color: 'var(--accent-color)', border: '1px solid var(--accent-mute)' }
                : isToday
                  ? { border: '1px solid var(--accent-mute)', color: 'var(--text-secondary)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] Create `src/components/Dashboard/Dashboard.tsx`

```tsx
import { useState, useEffect } from 'react'
import { getSessionsInRange } from '../../lib/queries/sessions'
import { getPlansForUser } from '../../lib/queries/plans'
import { db } from '../../lib/db'
import { EvolutionChart } from './EvolutionChart'
import { MonthCalendar } from './MonthCalendar'
import type { WorkoutSession } from '../../types'

interface Props { userId: number; onClose: () => void }

export function Dashboard({ userId, onClose }: Props) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [exercises, setExercises] = useState<{ id: number; name: string }[]>([])
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())

  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const to = `${year}-${String(month + 1).padStart(2, '0')}-31`

  useEffect(() => {
    getSessionsInRange(userId, from, to).then(setSessions)
  }, [userId, from, to])

  // Load exercises that have >= 2 logs
  useEffect(() => {
    db.execute({
      sql: `SELECT e.id, e.name FROM exercises e
            JOIN load_logs ll ON ll.exercise_id = e.id AND ll.user_id = ?
            GROUP BY e.id HAVING COUNT(*) >= 2`,
      args: [userId],
    }).then(({ rows }) => setExercises(rows.map(r => ({ id: r.id as number, name: r.name as string }))))
  }, [userId])

  // Streak calc
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    if (sessions.find(s => s.performedOn === ds) || i > 0) {
      if (sessions.find(s => s.performedOn === ds)) streak++
      else break
    }
  }

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setMonth(d.getMonth()); setYear(d.getFullYear())
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto" style={{ background: 'var(--bg-color)' }}>
      <header className="flex items-center justify-between px-4 pt-12 pb-4">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] text-2xl leading-none">×</button>
      </header>

      <div className="px-4 space-y-8 pb-12">
        {/* Streak */}
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <p className="text-4xl font-bold" style={{ color: 'var(--accent-color)', fontFamily: 'Outfit' }}>{streak}</p>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mt-1">dias seguidos</p>
        </div>

        {/* Evolution */}
        {exercises.length > 0 && (
          <div>
            <p className="text-xs tracking-widest text-[var(--text-muted)] uppercase font-bold mb-4">Evolução de Cargas</p>
            <div className="p-4 rounded-xl space-y-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              {exercises.map(ex => (
                <EvolutionChart key={ex.id} userId={userId} exerciseId={ex.id} exerciseName={ex.name} />
              ))}
            </div>
          </div>
        )}

        {/* Calendar */}
        <div>
          <p className="text-xs tracking-widest text-[var(--text-muted)] uppercase font-bold mb-4">Frequência Mensal</p>
          <div className="p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <MonthCalendar
              sessions={sessions}
              month={month} year={year}
              onPrev={() => changeMonth(-1)}
              onNext={() => changeMonth(1)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] Add dashboard button to `WorkoutView.tsx` header and wire state

```tsx
// Add state: const [dashOpen, setDashOpen] = useState(false)
// In header, add button:
<button onClick={() => setDashOpen(true)} className="text-[var(--text-muted)] p-2 text-xl">◎</button>
// After WorkoutSwitcher:
{dashOpen && <Dashboard userId={userId} onClose={() => setDashOpen(false)} />}
```

- [ ] Verify: dashboard opens, streak shows, calendar marks done days, charts appear after 2+ logs

- [ ] Commit

```bash
git add src/components/Dashboard/ src/components/WorkoutView/WorkoutView.tsx
git commit -m "feat: dashboard with evolution chart, calendar, streak"
```

---

## Task 14: Toast Notification

**Files:**
- Create: `src/components/ui/Toast.tsx`
- Modify: `src/App.tsx`

- [ ] Create `src/components/ui/Toast.tsx`

```tsx
import { useState, useCallback, createContext, useContext } from 'react'

interface ToastContextValue { showToast: (message: string) => void }
const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() { return useContext(ToastContext) }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl text-sm font-medium shadow-lg pointer-events-none"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}
```

- [ ] Wrap App in ToastProvider and use `showToast` in LoadModal and WorkoutView after saves

- [ ] Commit

```bash
git add src/components/ui/Toast.tsx src/App.tsx src/components/LoadModal/LoadModal.tsx src/components/WorkoutView/WorkoutView.tsx
git commit -m "feat: toast notification system"
```

---

## Task 15: localStorage Migration Script

**Files:**
- Create: `scripts/migrate-localstorage.ts` (runs in Node — reads exported JSON)

The strategy: export existing localStorage data from the browser, then import it into Turso.

- [ ] In the old app (current index.html), use the existing export button to get the backup JSON, save it as `scripts/localstorage-export.json`

- [ ] Create `scripts/migrate-localstorage.ts`

```ts
import { createClient } from '@libsql/client'
import { config } from 'dotenv'
import { readFileSync } from 'fs'

config({ path: '.env.local' })

const db = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL!,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN!,
})

interface OldData {
  history: { date: string; day: string }[]
  loads: Record<string, { date: string; cargas: number[] }[]>
}

async function migrate() {
  const raw = readFileSync('scripts/localstorage-export.json', 'utf-8')
  const data: OldData = JSON.parse(raw)

  // Migrate history → workout_sessions
  // Map day → plan_id for Ramon (user_id = 1)
  const { rows: planRows } = await db.execute("SELECT id, suggested_day FROM workout_plans WHERE user_id = 1")
  const planByDay = Object.fromEntries(planRows.map(r => [r.suggested_day as string, r.id as number]))

  for (const entry of data.history) {
    const planId = planByDay[entry.day]
    if (!planId) continue
    await db.execute({
      sql: `INSERT OR IGNORE INTO workout_sessions (user_id, plan_id, performed_on) VALUES (1, ?, ?)`,
      args: [planId, entry.date],
    })
  }

  // Migrate loads
  const { rows: exRows } = await db.execute("SELECT id, name FROM exercises")
  const exByName = Object.fromEntries(exRows.map(r => [r.name as string, r.id as number]))

  for (const [exName, entries] of Object.entries(data.loads)) {
    const exerciseId = exByName[exName]
    if (!exerciseId) { console.warn(`Exercise not found: ${exName}`); continue }

    for (const entry of entries) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO load_logs (user_id, exercise_id, logged_at) VALUES (1, ?, ?)`,
        args: [exerciseId, entry.date],
      })
      const { rows } = await db.execute({
        sql: `SELECT id FROM load_logs WHERE user_id = 1 AND exercise_id = ? AND logged_at = ?`,
        args: [exerciseId, entry.date],
      })
      const logId = rows[0].id as number
      await db.execute({ sql: `DELETE FROM load_log_sets WHERE log_id = ?`, args: [logId] })
      for (let i = 0; i < entry.cargas.length; i++) {
        await db.execute({
          sql: `INSERT INTO load_log_sets (log_id, set_number, weight) VALUES (?, ?, ?)`,
          args: [logId, i + 1, entry.cargas[i]],
        })
      }
    }
  }

  console.log('Migration complete.')
  process.exit(0)
}

migrate().catch(e => { console.error(e); process.exit(1) })
```

- [ ] Add to `package.json` scripts:

```json
"migrate": "tsx scripts/migrate-localstorage.ts"
```

- [ ] Export data from old app, save as `scripts/localstorage-export.json`, run `yarn migrate`

- [ ] Commit

```bash
git add scripts/migrate-localstorage.ts package.json
git commit -m "feat: localStorage to Turso migration script"
```

---

## Task 16: PWA Finalization

- [ ] Update `vite.config.ts` with full PWA config

```ts
VitePWA({
  registerType: 'autoUpdate',
  manifest: false,
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,woff2}'],
    runtimeCaching: [{
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
    }],
  },
})
```

- [ ] Add apple touch icons to `index.html`

```html
<link rel="apple-touch-icon" href="/icon.svg" id="apple-touch-icon" />
```

- [ ] In `App.tsx`, update apple-touch-icon href dynamically based on user

```ts
document.getElementById('apple-touch-icon')?.setAttribute('href',
  user.name === 'Andressa' ? '/icon.andressa.svg' : '/icon.svg'
)
```

- [ ] Build and verify PWA: `yarn build && yarn preview`
  - Open on mobile, add to home screen
  - Verify both users get correct theme/icon

- [ ] Final commit

```bash
git add -A
git commit -m "feat: PWA finalization — iron-protocol React migration complete"
```

---

## Summary

| Task | Feature | Status |
|------|---------|--------|
| 1 | Scaffold Vite + React + Tailwind | - |
| 2 | Turso setup | - |
| 3 | Schema + apply | - |
| 4 | TypeScript types | - |
| 5 | Seed scripts | - |
| 6 | Query layer | - |
| 7 | useUser + UserSelector | - |
| 8 | App shell + theme | - |
| 9 | WorkoutView + DayTabs | - |
| 10 | ExerciseCard | - |
| 11 | WorkoutSwitcher + Mark as Done | - |
| 12 | LoadModal | - |
| 13 | Dashboard | - |
| 14 | Toast | - |
| 15 | localStorage migration | - |
| 16 | PWA finalization | - |
