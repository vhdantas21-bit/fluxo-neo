import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Spinner({ label = 'Carregando…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center gap-3 text-sm text-fg-subtle', className)}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line-strong border-t-primary-text" aria-hidden />
      {label}
    </div>
  )
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong text-center',
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12',
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-fg-subtle [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-subtle">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function ProgressBar({ value, color, label }: { value: number; color?: string; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: color ?? 'var(--color-primary)' }}
      />
    </div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-2xl border border-line bg-surface p-5', className)}>{children}</section>
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-subtle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
