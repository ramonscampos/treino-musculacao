# Iron Protocol — Handoff para nova sessão

> Continue a implementação da migração React + Vite a partir da Task 6.

---

## Contexto do projeto

**Projeto:** Iron Protocol — app de treino de musculação (PWA)
**Diretório:** /Users/ramoncampos/Desktop/treino
**Branch:** master

## Stack

- Vite 8 + React 19 + TypeScript 6
- Tailwind CSS v4 (usa `@import "tailwindcss"` em globals.css, sem tailwind.config.ts)
- @libsql/client → Turso (SQLite serverless)
- vite-plugin-pwa
- Dois usuários: Ramon (tema lime #d1ff4e) e Andressa (tema purple #a78bfa)

## O que já foi feito (Tasks 1–5)

- Task 1: Scaffold completo (vite.config.ts, package.json, tsconfig, src/main.tsx, src/App.tsx placeholder, src/styles/globals.css)
- Task 2: Turso DB configurado (.env.local preenchido com URL e token)
- Task 3: Schema aplicado no Turso (7 tabelas: users, exercises, workout_plans, plan_exercises, workout_sessions, load_logs, load_log_sets)
- Task 4: src/types/index.ts criado (User, Exercise, WorkoutPlan, PlanExercise, LoadLog, LoadLogSet, WorkoutSession, DayKey, DAY_LABELS, DAY_ORDER, JS_DAY_TO_KEY, USER_THEMES)
- Task 5: scripts/seed-data.ts e scripts/seed.ts criados e executados com sucesso

## Arquivos chave já existentes

**src/lib/db.ts:**
```ts
import { createClient } from '@libsql/client'

export const db = createClient({
  url: import.meta.env.VITE_TURSO_DATABASE_URL,
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
})
```

**Estrutura de pastas já criada:**
```
src/
  main.tsx
  App.tsx          ← placeholder, precisa ser substituído
  lib/
    db.ts
    queries/       ← VAZIO, precisa criar
  types/
    index.ts
  hooks/           ← VAZIO, precisa criar
  components/
    ui/            ← VAZIO
    WorkoutView/   ← VAZIO
    LoadModal/     ← VAZIO
    Dashboard/     ← VAZIO
  styles/
    globals.css
scripts/
  seed-data.ts
  seed.ts
```

## Notas importantes

- **Tailwind v4**: usa `@import "tailwindcss"` em globals.css, sem tailwind.config.ts. Classes padrão funcionam. Para cores que usam CSS variables (var(--accent-color)), use `style={{}}` em vez de classes Tailwind.
- **Turso credentials**: já estão em `.env.local` (ignorado pelo git).
- **Scripts npm**: `yarn seed` e `yarn migrate`.
- Não há testes automatizados — verificar manualmente no browser.

---

## Task 6: Query layer

Crie os 3 arquivos abaixo:

### src/lib/queries/plans.ts

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

### src/lib/queries/sessions.ts

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
  return {
    id: r.id as number,
    userId: r.user_id as number,
    planId: r.plan_id as number,
    performedOn: r.performed_on as string,
  }
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
    id: r.id as number,
    userId: r.user_id as number,
    planId: r.plan_id as number,
    performedOn: r.performed_on as string,
  }))
}
```

### src/lib/queries/loads.ts

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

**Commit:** `feat: add query layer for plans, sessions, loads`

---

## Task 7: useUser hook + UserSelector

### src/hooks/useUser.ts

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

### src/components/UserSelector.tsx

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
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
          Iron Protocol
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Quem vai treinar?
        </h1>
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

**Commit:** `feat: user selection with localStorage persistence`

---

## Task 8: App shell + tema

Substitua **src/App.tsx** completamente:

```tsx
import { useEffect } from 'react'
import { useUser } from './hooks/useUser'
import { UserSelector } from './components/UserSelector'
import { WorkoutView } from './components/WorkoutView/WorkoutView'
import { USER_THEMES } from './types'

export function App() {
  const { user, users, loading, selectUser } = useUser()

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
    const touchIcon = document.getElementById('apple-touch-icon')
    if (touchIcon) touchIcon.setAttribute('href', user.name === 'Andressa' ? '/icon.andressa.svg' : '/icon.svg')
    document.title = user.name === 'Andressa' ? 'Protocolo Gostosa 2.0' : 'Iron Protocol'
  }, [user])

  if (loading) return <div className="min-h-dvh" style={{ background: 'var(--bg-color)' }} />
  if (!user) return <UserSelector users={users} onSelect={selectUser} />
  return <WorkoutView userId={user.id} />
}
```

**Commit:** `feat: app shell with theme injection and user guard`

---

## Task 9: useWorkoutPlan + WorkoutView + DayTabs

### src/hooks/useWorkoutPlan.ts

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

  const activePlan = overridePlanId
    ? plans.find(p => p.id === overridePlanId)
    : plans.find(p => p.suggestedDay === selectedDay)

  useEffect(() => {
    if (!activePlan) { setExercises([]); setLoading(false); return }
    setLoading(true)
    getPlanExercises(activePlan.id).then(ex => { setExercises(ex); setLoading(false) })
  }, [activePlan?.id])

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

### src/components/WorkoutView/DayTabs.tsx

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
              : {
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  color: isToday ? 'var(--accent-color)' : 'var(--text-secondary)',
                }
            }
          >
            {DAY_LABELS[day]}
            {isToday && !isSelected && (
              <span
                className="block w-1 h-1 rounded-full mx-auto mt-0.5"
                style={{ background: 'var(--accent-color)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
```

### src/components/WorkoutView/WorkoutView.tsx

```tsx
import { useState, useEffect } from 'react'
import { useWorkoutPlan, todayKey, todayStr } from '../../hooks/useWorkoutPlan'
import { getLastLoad } from '../../lib/queries/loads'
import { getSessionForDate, upsertSession } from '../../lib/queries/sessions'
import { DayTabs } from './DayTabs'
import { ExerciseCard } from './ExerciseCard'
import { WorkoutSwitcher } from './WorkoutSwitcher'
import { LoadModal } from '../LoadModal/LoadModal'
import { Dashboard } from '../Dashboard/Dashboard'
import { useLoadLogs } from '../../hooks/useLoadLogs'
import type { PlanExercise } from '../../types'

interface Props { userId: number }

export function WorkoutView({ userId }: Props) {
  const {
    plans, selectedDay, setSelectedDay,
    activePlan, setOverridePlanId, exercises, loading,
  } = useWorkoutPlan(userId)

  const [weightsMap, setWeightsMap] = useState<Record<number, number[]>>({})
  const [loadModalEx, setLoadModalEx] = useState<PlanExercise | null>(null)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [dashOpen, setDashOpen] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const { saveLoad, getLastLoggedLoad } = useLoadLogs(userId)

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

  useEffect(() => {
    if (selectedDay !== todayKey()) { setSessionDone(false); return }
    getSessionForDate(userId, todayStr()).then(s => setSessionDone(!!s))
  }, [userId, selectedDay])

  async function handleMarkDone() {
    if (!activePlan) return
    await upsertSession(userId, activePlan.id, todayStr())
    setSessionDone(true)
  }

  function handleLoadSaved(exerciseId: number, weights: number[]) {
    setWeightsMap(prev => ({ ...prev, [exerciseId]: weights }))
  }

  const supersetPairs = new Set(exercises.filter(e => e.isSupersetWith).map(e => e.isSupersetWith!))
  const isToday = selectedDay === todayKey()

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-color)' }}>
      <header className="flex items-center justify-between px-4 pt-12 pb-2">
        <div>
          <p className="text-xs tracking-widest uppercase font-bold" style={{ color: 'var(--accent-color)' }}>
            Iron Protocol
          </p>
          <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {activePlan?.title ?? ''}
          </h1>
        </div>
        <button onClick={() => setDashOpen(true)} className="p-2 text-xl" style={{ color: 'var(--text-muted)' }}>
          ◎
        </button>
      </header>

      <DayTabs selected={selectedDay} onSelect={setSelectedDay} todayKey={todayKey()} />

      <main className="flex-1 px-4 pb-32 space-y-3">
        {loading && (
          <p className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        )}
        {!loading && exercises.length === 0 && (
          <p className="text-sm py-12 text-center" style={{ color: 'var(--text-muted)' }}>
            Descanso. Aproveite!
          </p>
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

      {isToday && (
        <div
          className="fixed bottom-0 left-0 right-0 p-4 flex gap-3"
          style={{ background: 'linear-gradient(to top, var(--bg-color) 70%, transparent)' }}
        >
          <button
            onClick={() => setSwitcherOpen(true)}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-secondary)',
            }}
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
            {sessionDone ? '✓ Feito!' : 'Marcar feito'}
          </button>
        </div>
      )}

      <WorkoutSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        plans={plans}
        activePlanId={activePlan?.id}
        onSelect={planId => setOverridePlanId(planId)}
      />
      <LoadModal
        exercise={loadModalEx}
        onClose={() => setLoadModalEx(null)}
        onSaved={handleLoadSaved}
        getLastLoad={getLastLoggedLoad}
        saveLoad={saveLoad}
      />
      {dashOpen && <Dashboard userId={userId} onClose={() => setDashOpen(false)} />}
    </div>
  )
}
```

**Commit:** `feat: workout view with day tabs and plan navigation`

---

## Task 10: ExerciseCard

### src/components/WorkoutView/ExerciseCard.tsx

```tsx
import type { PlanExercise } from '../../types'

interface Props {
  exercise: PlanExercise
  lastWeights: number[]
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
      className="p-4 rounded-xl transition-all"
      style={{
        background: 'var(--card-bg)',
        border: `1px solid ${isSupersetPair ? 'var(--accent-mute)' : 'var(--card-border)'}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold leading-snug flex-1" style={{ color: 'var(--text-primary)' }}>
          {ex.exerciseName}
        </p>
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

      {ex.muscleFocus && (
        <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent-color)' }}>
          {ex.muscleFocus}
        </p>
      )}

      <div className="flex items-center gap-3 mt-2">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{formatSets(ex)}</span>
        {ex.restSeconds && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Descanso: {formatRest(ex.restSeconds)}
          </span>
        )}
      </div>

      {ex.executionCues.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {ex.executionCues.map((cue, i) => (
            <li key={i} className="text-xs flex gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--accent-mute)' }}>•</span>
              {cue}
            </li>
          ))}
        </ul>
      )}

      {ex.note && (
        <p className="text-xs mt-2 italic" style={{ color: 'var(--text-muted)' }}>{ex.note}</p>
      )}

      {ex.isSupersetWith && (
        <p className="text-xs mt-2" style={{ color: 'var(--accent-color)' }}>superset ↓</p>
      )}
    </div>
  )
}
```

**Commit:** `feat: exercise card with sets, cues, muscle focus, load chip`

---

## Task 11: BottomSheet + WorkoutSwitcher

### src/components/ui/BottomSheet.tsx

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
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl p-6 max-h-[85dvh] overflow-y-auto"
        style={{ background: '#16161a', border: '1px solid var(--card-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--card-border)' }} />
        {title && (
          <p className="font-semibold text-base mb-4" style={{ color: 'var(--text-primary)' }}>{title}</p>
        )}
        {children}
      </div>
    </div>
  )
}
```

### src/components/WorkoutView/WorkoutSwitcher.tsx

```tsx
import { BottomSheet } from '../ui/BottomSheet'
import type { WorkoutPlan } from '../../types'

const DAY_PT: Record<string, string> = {
  SEG: 'Seg', TER: 'Ter', QUA: 'Qua', QUI: 'Qui', SEX: 'Sex', SAB: 'Sáb', DOM: 'Dom',
}

interface Props {
  open: boolean
  onClose: () => void
  plans: WorkoutPlan[]
  activePlanId?: number
  onSelect: (planId: number) => void
}

export function WorkoutSwitcher({ open, onClose, plans, activePlanId, onSelect }: Props) {
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
              <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>
                {DAY_PT[plan.suggestedDay]}
              </span>
              <span className="font-medium">{plan.name}</span>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
```

**Commit:** `feat: bottom sheet ui and workout switcher`

---

## Task 12: useLoadLogs + LoadModal

### src/hooks/useLoadLogs.ts

```ts
import { useCallback, useState } from 'react'
import { getLoadForDate, getLastLoad, upsertLoad } from '../lib/queries/loads'
import { todayStr } from './useWorkoutPlan'

export function useLoadLogs(userId: number) {
  const [saving, setSaving] = useState(false)

  const saveLoad = useCallback(async (exerciseId: number, weights: number[]) => {
    setSaving(true)
    try { await upsertLoad(userId, exerciseId, todayStr(), weights) }
    finally { setSaving(false) }
  }, [userId])

  const getTodayLoad = useCallback((exerciseId: number) =>
    getLoadForDate(userId, exerciseId, todayStr()), [userId])

  const getLastLoggedLoad = useCallback((exerciseId: number) =>
    getLastLoad(userId, exerciseId), [userId])

  return { saveLoad, getTodayLoad, getLastLoggedLoad, saving }
}
```

### src/components/LoadModal/LoadModal.tsx

```tsx
import { useState, useEffect } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import type { PlanExercise } from '../../types'

interface Props {
  exercise: PlanExercise | null
  onClose: () => void
  onSaved: (exerciseId: number, weights: number[]) => void
  getLastLoad: (exerciseId: number) => Promise<{ sets: { weight: number }[] } | null>
  saveLoad: (exerciseId: number, weights: number[]) => Promise<void>
}

export function LoadModal({ exercise, onClose, onSaved, getLastLoad, saveLoad }: Props) {
  const [weights, setWeights] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!exercise) return
    getLastLoad(exercise.exerciseId).then(log => {
      const count = exercise.sets ?? 3
      if (log && log.sets.length > 0) {
        setWeights(
          Array.from({ length: count }, (_, i) =>
            String(log.sets[i]?.weight ?? log.sets[log.sets.length - 1]?.weight ?? '')
          )
        )
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
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            {setCount} {setCount === 1 ? 'série' : 'séries'} — informe o peso (kg) de cada uma
          </p>
          <div className="space-y-3 mb-6">
            {Array.from({ length: setCount }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs w-12" style={{ color: 'var(--text-muted)' }}>Série {i + 1}</span>
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
                  className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                  }}
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>kg</span>
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

**Commit:** `feat: load modal with per-set weight inputs`

---

## Task 13: Dashboard

### src/components/Dashboard/EvolutionChart.tsx

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
  const getAvg = (log: LoadLog) =>
    log.sets.length === 0 ? 0 : Math.round(log.sets.reduce((s, set) => s + set.weight, 0) / log.sets.length)
  const getLabel = (log: LoadLog) =>
    log.sets.length > 1 ? log.sets.map(s => s.weight).join('/') : String(log.sets[0]?.weight ?? 0)
  const maxVal = Math.max(...last5.map(getAvg), 1)

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-center mb-3" style={{ color: 'var(--text-secondary)' }}>
        {exerciseName}
      </p>
      <div className="flex items-end justify-center gap-3" style={{ height: 54 }}>
        {last5.map((log, i) => {
          const avg = getAvg(log)
          const h = Math.max(4, Math.round((avg / maxVal) * 38))
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{getLabel(log)}</span>
              <div
                className="w-6 rounded-sm"
                style={{ height: h, background: 'var(--accent-color)', opacity: i === last5.length - 1 ? 1 : 0.4 }}
              />
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{log.loggedAt.slice(5)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### src/components/Dashboard/MonthCalendar.tsx

```tsx
import type { WorkoutSession } from '../../types'

const PT_MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

interface Props {
  sessions: WorkoutSession[]
  month: number
  year: number
  onPrev: () => void
  onNext: () => void
}

export function MonthCalendar({ sessions, month, year, onPrev, onNext }: Props) {
  const doneDates = new Set(sessions.map(s => s.performedOn))
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = new Date().toISOString().slice(0, 10)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="px-2 text-lg" style={{ color: 'var(--text-muted)' }}>‹</button>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {PT_MONTHS[month]} {year}
        </p>
        <button onClick={onNext} className="px-2 text-lg" style={{ color: 'var(--text-muted)' }}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <p key={i} className="text-center text-[9px] font-semibold pb-1" style={{ color: 'var(--text-muted)' }}>
            {d}
          </p>
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

### src/components/Dashboard/Dashboard.tsx

```tsx
import { useState, useEffect } from 'react'
import { getSessionsInRange } from '../../lib/queries/sessions'
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

  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${year}-${pad(month + 1)}-01`
  const to = `${year}-${pad(month + 1)}-31`

  useEffect(() => {
    getSessionsInRange(userId, from, to).then(setSessions)
  }, [userId, from, to])

  useEffect(() => {
    db.execute({
      sql: `SELECT e.id, e.name FROM exercises e
            JOIN load_logs ll ON ll.exercise_id = e.id AND ll.user_id = ?
            GROUP BY e.id HAVING COUNT(*) >= 2`,
      args: [userId],
    }).then(({ rows }) =>
      setExercises(rows.map(r => ({ id: r.id as number, name: r.name as string })))
    )
  }, [userId])

  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    if (sessions.find(s => s.performedOn === ds)) streak++
    else if (i > 0) break
  }

  function changeMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setMonth(d.getMonth())
    setYear(d.getFullYear())
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto" style={{ background: 'var(--bg-color)' }}>
      <header className="flex items-center justify-between px-4 pt-12 pb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h2>
        <button onClick={onClose} className="text-2xl leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
      </header>

      <div className="px-4 space-y-8 pb-12">
        <div
          className="p-4 rounded-xl text-center"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          <p className="text-4xl font-bold" style={{ color: 'var(--accent-color)', fontFamily: 'Outfit' }}>
            {streak}
          </p>
          <p className="text-xs uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>
            dias seguidos
          </p>
        </div>

        {exercises.length > 0 && (
          <div>
            <p className="text-xs tracking-widest uppercase font-bold mb-4" style={{ color: 'var(--text-muted)' }}>
              Evolução de Cargas
            </p>
            <div
              className="p-4 rounded-xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            >
              {exercises.map(ex => (
                <EvolutionChart key={ex.id} userId={userId} exerciseId={ex.id} exerciseName={ex.name} />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs tracking-widest uppercase font-bold mb-4" style={{ color: 'var(--text-muted)' }}>
            Frequência Mensal
          </p>
          <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <MonthCalendar
              sessions={sessions}
              month={month}
              year={year}
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

**Commit:** `feat: dashboard with evolution chart, calendar, streak`

---

## Task 14: Toast

### src/components/ui/Toast.tsx

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

Atualize **src/main.tsx**:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'
import { ToastProvider } from './components/ui/Toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
```

**Commit:** `feat: toast notification system`

---

## Task 15: Script de migração do localStorage

### scripts/migrate-localstorage.ts

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

  const { rows: planRows } = await db.execute(
    'SELECT id, suggested_day FROM workout_plans WHERE user_id = 1'
  )
  const planByDay = Object.fromEntries(
    planRows.map(r => [r.suggested_day as string, r.id as number])
  )

  for (const entry of data.history) {
    const planId = planByDay[entry.day]
    if (!planId) continue
    await db.execute({
      sql: `INSERT OR IGNORE INTO workout_sessions (user_id, plan_id, performed_on) VALUES (1, ?, ?)`,
      args: [planId, entry.date],
    })
  }

  const { rows: exRows } = await db.execute('SELECT id, name FROM exercises')
  const exByName = Object.fromEntries(
    exRows.map(r => [r.name as string, r.id as number])
  )

  for (const [exName, entries] of Object.entries(data.loads)) {
    const exerciseId = exByName[exName]
    if (!exerciseId) { console.warn(`Exercício não encontrado: ${exName}`); continue }
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

  console.log('Migração concluída.')
  process.exit(0)
}

migrate().catch(e => { console.error(e); process.exit(1) })
```

Para usar: exporte os dados pelo botão de backup do app antigo (index.html), salve como `scripts/localstorage-export.json` e rode `yarn migrate`.

**Commit:** `feat: localStorage to Turso migration script`

---

## Task 16: Verificação final

1. `yarn build` — corrija qualquer erro de TypeScript
2. `yarn preview` — abra no browser e teste:
   - Selecionar usuário (Ramon / Andressa)
   - Navegar entre dias da semana
   - Ver exercícios com cues e muscle focus
   - Registrar carga (modal)
   - Marcar treino como feito
   - Trocar treino do dia
   - Abrir dashboard (◎)
3. No mobile: instalar como PWA e verificar tema/ícone correto por usuário

**Commit final:** `feat: iron-protocol React migration complete`
