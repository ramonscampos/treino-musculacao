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
