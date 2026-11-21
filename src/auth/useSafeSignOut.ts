import { useAuth } from '@/auth/AuthProvider'
import { useConfirm } from '@/components/ui/Confirm'
import { useToast } from '@/components/ui/Toast'
import { clearOfflineData } from '@/data/offlineRepository'
import { getSyncState } from '@/lib/syncState'
import { errorMessage, pluralize } from '@/lib/utils'

/**
 * Sair da conta com segurança: avisa se ainda há alterações feitas sem internet
 * que não chegaram ao servidor e, ao sair, apaga a cópia local dos dados deste
 * aparelho (privacidade em aparelhos compartilhados).
 */
export function useSafeSignOut() {
  const { user, signOut } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()

  return async () => {
    const { queued } = getSyncState()
    if (queued > 0) {
      const ok = await confirm({
        title: 'Sair sem sincronizar?',
        message: `${pluralize(queued, 'alteração feita sem internet ainda não foi enviada', 'alterações feitas sem internet ainda não foram enviadas')} ao servidor. Se sair agora, ela${queued === 1 ? '' : 's'} será${queued === 1 ? '' : 'ão'} perdida${queued === 1 ? '' : 's'}. Conecte-se à internet e aguarde “Sincronizado” para não perder nada.`,
        confirmLabel: 'Sair mesmo assim',
        danger: true,
      })
      if (!ok) return
    }
    try {
      const id = user?.id
      await signOut()
      if (id) clearOfflineData(id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
}
