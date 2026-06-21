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
