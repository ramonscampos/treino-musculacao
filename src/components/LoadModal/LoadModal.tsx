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
