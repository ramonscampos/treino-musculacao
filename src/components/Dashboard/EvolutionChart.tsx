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
