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
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto mx-auto" style={{ background: 'var(--bg-color)', maxWidth: 600 }}>
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
