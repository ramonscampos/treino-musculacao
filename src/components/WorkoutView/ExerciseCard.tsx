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
