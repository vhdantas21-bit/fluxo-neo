import { useState, type FormEvent } from 'react'
import { Check, Download, HardDrive, LogOut, Plus, Trash } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { Card, PageHeader } from '@/components/ui/misc'
import { useConfirm } from '@/components/ui/Confirm'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/store/DataProvider'
import { PALETTE_SWATCHES } from '@/types'
import { errorMessage, pluralize } from '@/lib/utils'

const SHORTCUTS: Array<[string, string]> = [
  ['N', 'Nova tarefa'],
  ['/  ou  Ctrl + K', 'Pesquisar'],
  ['Ctrl + Enter', 'Salvar tarefa aberta'],
  ['Esc', 'Fechar janela'],
  ['Espaço (num cartão)', 'Pegar / soltar ao mover com o teclado'],
  ['Setas', 'Mover cartão entre posições e colunas'],
]

export function SettingsPage() {
  const { mode, user, signOut } = useAuth()
  const { data, updateProfile, createCategory, updateCategory, deleteCategory, repoKind } = useData()
  const confirm = useConfirm()
  const toast = useToast()
  const [name, setName] = useState(data.profile.displayName)
  const [newCat, setNewCat] = useState('')

  const saveProfile = (e: FormEvent) => {
    e.preventDefault()
    updateProfile({ ...data.profile, displayName: name.trim().slice(0, 80) })
    toast.success('Perfil atualizado.')
  }

  const addCategory = (e: FormEvent) => {
    e.preventDefault()
    if (!newCat.trim()) return
    if (data.categories.some((c) => c.name.toLowerCase() === newCat.trim().toLowerCase())) {
      toast.error('Já existe uma categoria com esse nome.')
      return
    }
    createCategory(newCat, PALETTE_SWATCHES[data.categories.length % PALETTE_SWATCHES.length].value)
    setNewCat('')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fluxo-neo-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configurações" description="Perfil, foco, categorias e conta." />

      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="mb-4 text-sm font-semibold">Perfil</h2>
          <form onSubmit={saveProfile} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field label="Como você quer ser chamado" htmlFor="profile-name" className="flex-1">
              <Input id="profile-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </Field>
            <Button type="submit" variant="primary" disabled={name.trim() === data.profile.displayName}>
              <Check size={16} aria-hidden /> Salvar
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Foco</h2>
          <p className="mt-1 mb-4 text-[13px] text-fg-subtle">
            Limitar as tarefas em “Fazendo” ajuda a terminar antes de começar outra. A coluna avisa quando passar o limite.
          </p>
          <Field label="Limite de tarefas em Fazendo" htmlFor="wip" className="max-w-xs">
            <Select
              id="wip"
              value={data.profile.wipLimit ?? ''}
              onChange={(e) => {
                updateProfile({ ...data.profile, wipLimit: e.target.value ? Number(e.target.value) : null })
                toast.success('Limite atualizado.')
              }}
            >
              <option value="">Sem limite</option>
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'tarefa' : 'tarefas'}
                </option>
              ))}
            </Select>
          </Field>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Categorias</h2>
          <form onSubmit={addCategory} className="mb-4 flex gap-2">
            <label htmlFor="new-category" className="sr-only">
              Nova categoria
            </label>
            <Input id="new-category" value={newCat} maxLength={40} onChange={(e) => setNewCat(e.target.value)} placeholder="Ex.: Trabalho, Pessoal, Estudo" />
            <Button type="submit" disabled={!newCat.trim()}>
              <Plus size={16} aria-hidden /> Adicionar
            </Button>
          </form>
          {data.categories.length === 0 ? (
            <p className="text-[13px] text-fg-subtle">Ainda não há categorias. Use-as para separar áreas da sua vida.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {data.categories.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <label className="sr-only" htmlFor={`cat-color-${c.id}`}>
                    Cor de {c.name}
                  </label>
                  <select
                    id={`cat-color-${c.id}`}
                    value={c.color}
                    onChange={(e) => updateCategory(c.id, { color: e.target.value })}
                    className="h-6 w-6 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-line-strong text-transparent"
                    style={{ background: c.color }}
                  >
                    {PALETTE_SWATCHES.map((s) => (
                      <option key={s.value} value={s.value} className="bg-surface text-fg">
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <input
                    defaultValue={c.name}
                    maxLength={40}
                    aria-label={`Nome da categoria ${c.name}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (!v) e.target.value = c.name
                      else if (v !== c.name) {
                        updateCategory(c.id, { name: v })
                        toast.success('Categoria renomeada.')
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    className="h-9 min-w-0 flex-1 rounded-md bg-transparent px-2 text-sm hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
                  />
                  <span className="text-xs text-fg-subtle tabular-nums">
                    {pluralize(data.tasks.filter((t) => t.categoryId === c.id).length, 'tarefa', 'tarefas')}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Excluir categoria ${c.name}`}
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Excluir categoria?',
                        message: `“${c.name}” será excluída. As tarefas associadas mantêm-se, sem categoria.`,
                        confirmLabel: 'Excluir',
                        danger: true,
                      })
                      if (ok) {
                        deleteCategory(c.id)
                        toast.success('Categoria excluída.')
                      }
                    }}
                  >
                    <Trash size={15} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold">Conta e dados</h2>
          {mode === 'supabase' ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm">{user?.email}</p>
                <p className="text-xs text-fg-subtle">Dados salvos no Supabase e sincronizados entre dispositivos.</p>
              </div>
              <Button onClick={() => signOut().catch((e) => toast.error(errorMessage(e)))}>
                <LogOut size={15} aria-hidden /> Sair
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-line-strong bg-surface-2 p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <HardDrive size={16} className="text-fg-subtle" aria-hidden /> Modo local (sem conta)
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                Os dados ficam salvos apenas neste navegador. Para ativar contas, sincronização entre dispositivos e
                segurança por usuário, configure o Supabase:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-fg-muted">
                <li>Crie um projeto em supabase.com.</li>
                <li>
                  Execute <code className="rounded bg-surface-3 px-1">supabase/migrations/0001_init.sql</code> no SQL Editor.
                </li>
                <li>
                  Copie <code className="rounded bg-surface-3 px-1">.env.example</code> para{' '}
                  <code className="rounded bg-surface-3 px-1">.env.local</code> e preencha o URL e a chave pública (anon).
                </li>
                <li>Reinicie a aplicação. A tela de login aparece automaticamente.</li>
              </ol>
              <p className="mt-2 text-xs text-fg-subtle">Instruções completas no README do projeto.</p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button onClick={exportData}>
              <Download size={15} aria-hidden /> Exportar dados (JSON)
            </Button>
            <span className="text-xs text-fg-subtle">
              {data.tasks.length} tarefas · {data.projects.length} projetos · armazenamento: {repoKind === 'local' ? 'navegador' : 'Supabase'}
            </span>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Atalhos de teclado</h2>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 text-[13px]">
                <dt className="text-fg-muted">{v}</dt>
                <dd>
                  <kbd className="rounded border border-line-strong bg-surface-2 px-1.5 py-0.5 text-xs text-fg">{k}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  )
}
