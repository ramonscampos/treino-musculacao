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
