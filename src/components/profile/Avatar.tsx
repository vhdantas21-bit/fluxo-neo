import { useRef, useState } from 'react'
import { UserRound } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/store/DataProvider'
import { imageFileToAvatar, initials } from '@/lib/avatar'
import { cn, errorMessage } from '@/lib/utils'

/** Nome a mostrar: perfil → nome do cadastro → parte do email. */
export function useDisplayName(): string {
  const { data } = useData()
  const { user } = useAuth()
  return (
    data.profile.displayName.trim() ||
    ((user?.user_metadata?.full_name as string | undefined) ?? '').trim() ||
    (user?.email?.split('@')[0] ?? '')
  )
}

interface AvatarProps {
  src: string | null
  name: string
  className?: string
}

/** Foto de perfil redonda; sem foto mostra as iniciais ou um ícone. */
export function Avatar({ src, name, className }: AvatarProps) {
  const letters = initials(name)
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-deep font-semibold text-fg select-none',
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name ? `Foto de ${name}` : 'Foto de perfil'} className="h-full w-full object-cover" draggable={false} />
      ) : letters ? (
        <span aria-hidden className="text-[0.4em] leading-none">{letters}</span>
      ) : (
        <UserRound aria-hidden className="h-1/2 w-1/2 text-primary-text" />
      )}
    </span>
  )
}

/**
 * Escolher, trocar e remover a foto de perfil. Renderize `input` em algum
 * lugar da página e chame `choose()` a partir de um botão.
 */
export function useAvatarPicker() {
  const { data, updateProfile } = useData()
  const toast = useToast()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setBusy(true)
        try {
          const avatar = await imageFileToAvatar(file)
          updateProfile({ avatar })
          toast.success('Foto de perfil atualizada.')
        } catch (err) {
          toast.error(errorMessage(err))
        } finally {
          setBusy(false)
        }
      }}
    />
  )

  return {
    input,
    busy,
    hasPhoto: !!data.profile.avatar,
    choose: () => ref.current?.click(),
    remove: () => {
      updateProfile({ avatar: null })
      toast.success('Foto removida.')
    },
  }
}
