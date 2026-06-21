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
    <div className="flex flex-col min-h-dvh mx-auto" style={{ background: 'var(--bg-color)', maxWidth: 600 }}>
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
