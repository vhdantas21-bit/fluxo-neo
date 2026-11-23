import { Fragment } from 'react'
import { Modal } from '@/components/ui/Modal'

/** Tecla modificadora como o sistema a mostra: ⌘ no Mac, Ctrl nos demais. */
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl'

/** Lista única de atalhos (janela "?" e Configurações). Cada atalho: teclas alternativas, cada uma com suas partes. */
export const SHORTCUT_GROUPS: Array<{ title: string; items: Array<{ keys: string[][]; label: string }> }> = [
  {
    title: 'Geral',
    items: [
      { keys: [['N']], label: 'Nova tarefa' },
      { keys: [['/'], [MOD, 'K']], label: 'Pesquisar' },
      { keys: [['?']], label: 'Mostrar esta lista de atalhos' },
    ],
  },
  {
    title: 'Na janela da tarefa',
    items: [
      { keys: [[MOD, 'Enter']], label: 'Salvar' },
      { keys: [['Esc']], label: 'Fechar' },
    ],
  },
  {
    title: 'Na Agenda',
    items: [
      { keys: [['T']], label: 'Ir para hoje' },
      { keys: [['W'], ['M'], ['Q'], ['A']], label: 'Semana, Mês, 3 Meses, Programação' },
      { keys: [['←', '→']], label: 'Período anterior / seguinte' },
    ],
  },
  {
    title: 'No quadro (com um cartão selecionado)',
    items: [
      { keys: [['Espaço']], label: 'Pegar / soltar o cartão' },
      { keys: [['↑', '↓', '←', '→']], label: 'Mover entre posições e colunas' },
      { keys: [['Enter']], label: 'Abrir a tarefa' },
    ],
  },
]

export function Keys({ keys }: { keys: string[][] }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {keys.map((combo, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-xs text-fg-subtle">ou</span>}
          <span className="flex items-center gap-0.5">
            {combo.map((k) => (
              <kbd
                key={k}
                className="min-w-6 rounded-md border border-line-strong bg-surface-2 px-1.5 py-0.5 text-center text-xs font-medium text-fg shadow-[inset_0_-1px_0_var(--color-line-strong)]"
              >
                {k}
              </kbd>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  )
}

/** Lista de atalhos agrupada, usada na janela e em Configurações. */
export function ShortcutList({ columns = false }: { columns?: boolean }) {
  return (
    <div className={columns ? 'grid gap-x-8 gap-y-5 sm:grid-cols-2' : 'flex flex-col gap-5'}>
      {SHORTCUT_GROUPS.map((g) => (
        <section key={g.title}>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-fg-subtle uppercase">{g.title}</h3>
          <dl className="flex flex-col gap-2">
            {g.items.map((it) => (
              <div key={it.label} className="flex items-center justify-between gap-3 text-[13px]">
                <dt className="text-fg-muted">{it.label}</dt>
                <dd>
                  <Keys keys={it.keys} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Atalhos de teclado" description="Funcionam em qualquer tela, fora dos campos de texto." size="sm">
      <ShortcutList />
    </Modal>
  )
}
