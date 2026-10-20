import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SunMoonTheme = 'light' | 'dark'

export interface SunMoonThemeToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'children'> {
  /** Tema controlado. Se omitido, o componente gere o próprio estado. */
  theme?: SunMoonTheme
  defaultTheme?: SunMoonTheme
  onThemeChange?: (theme: SunMoonTheme) => void
  /** Aplica o tema ao <html> (data-theme, classe e color-scheme). */
  syncDocument?: boolean
  /** Chave do localStorage onde a escolha fica guardada. */
  storageKey?: string
  /** Duração da animação, em ms. */
  duration?: number
  /** Diâmetro do botão, em px. */
  size?: number
  classNames?: { sun?: string; moon?: string }
  /** Fundo de "céu": dia azul-claro, noite azul-escuro com estrelas. */
  sky?: boolean
  ref?: React.Ref<HTMLButtonElement>
}

function readStored(key: string | undefined): SunMoonTheme | null {
  if (!key) return null
  try {
    const v = localStorage.getItem(key)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/** Aplica o tema ao documento. Usado também pelo script inline do index.html. */
export function applyThemeToDocument(theme: SunMoonTheme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171717' : '#f4f5f7')
}

export function SunMoonThemeToggle({
  theme: themeProp,
  defaultTheme = 'dark',
  onThemeChange,
  syncDocument = true,
  storageKey,
  duration = 500,
  size = 40,
  classNames,
  sky = false,
  className,
  style,
  onClick,
  ref,
  ...rest
}: SunMoonThemeToggleProps) {
  const [internal, setInternal] = React.useState<SunMoonTheme>(() => readStored(storageKey) ?? defaultTheme)
  const theme = themeProp ?? internal
  const isDark = theme === 'dark'

  React.useEffect(() => {
    if (syncDocument) applyThemeToDocument(theme)
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, theme)
      } catch {
        /* armazenamento bloqueado: o tema vale só para esta sessão */
      }
    }
  }, [theme, syncDocument, storageKey])

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (e.defaultPrevented) return
    const next: SunMoonTheme = isDark ? 'light' : 'dark'
    if (themeProp === undefined) setInternal(next)
    onThemeChange?.(next)
  }

  const icon = Math.round(size * 0.48)
  const transition = `transform ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${duration}ms ease`

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      onClick={toggle}
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong',
        !sky && 'bg-surface-2 hover:bg-surface-3',
        className,
      )}
      style={{
        width: size,
        height: size,
        transition: `background-color ${duration}ms ease`,
        backgroundColor: sky ? (isDark ? '#132967' : '#dfe7f6') : undefined,
        ...style,
      }}
      {...rest}
    >
      {sky && (
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ opacity: isDark ? 1 : 0, transition: `opacity ${duration}ms ease` }}>
          <span className="absolute h-[2px] w-[2px] rounded-full bg-white/90" style={{ top: '22%', left: '24%' }} />
          <span className="absolute h-[1.5px] w-[1.5px] rounded-full bg-white/70" style={{ top: '64%', left: '20%' }} />
          <span className="absolute h-[2px] w-[2px] rounded-full bg-white/80" style={{ top: '30%', left: '72%' }} />
        </span>
      )}
      <Sun
        aria-hidden
        size={icon}
        className={cn('absolute', sky ? 'text-[#de6a43]' : 'text-accent-text', classNames?.sun)}
        style={{
          transition,
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'translateY(110%) rotate(-90deg) scale(0.6)' : 'translateY(0) rotate(0) scale(1)',
        }}
      />
      <Moon
        aria-hidden
        size={icon}
        className={cn('absolute', sky ? 'text-[#fefefe]' : 'text-primary-text', classNames?.moon)}
        style={{
          transition,
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'translateY(0) rotate(0) scale(1)' : 'translateY(-110%) rotate(90deg) scale(0.6)',
        }}
      />
    </button>
  )
}

export default SunMoonThemeToggle
