import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null)

/** Fornece `confirm()` assíncrono com um diálogo acessível. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<(v: boolean) => void>(undefined)

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = (v: boolean) => {
    resolver.current?.(v)
    resolver.current = undefined
    setOpts(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!opts}
        onClose={() => close(false)}
        title={opts?.title ?? ''}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button variant={opts?.danger ? 'danger' : 'primary'} onClick={() => close(true)} data-autofocus>
              {opts?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-fg-muted">{opts?.message}</p>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm fora do ConfirmProvider')
  return ctx
}
