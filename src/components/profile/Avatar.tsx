import { useRef, useState } from 'react'
import { Camera, UserRound } from 'lucide-react'
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
        // flex (e não inline-flex): sem o espaço da linha de texto embaixo, o anel fica rente à foto.
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-deep font-semibold text-fg select-none',
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

const PHOTO_SIZE = {
  lg: { avatar: 'h-20 w-20 text-[40px] sm:h-32 sm:w-32 sm:text-[64px]', ring: 'ring-4', icon: 22 },
  md: { avatar: 'h-12 w-12 text-[24px] sm:h-14 sm:w-14 sm:text-[28px]', ring: 'ring-[3px]', icon: 18 },
}

/**
 * Foto de perfil clicável (troca a foto), com anel e câmera ao passar o mouse.
 * Usada no destaque do Início e no cabeçalho do Meu quadro, para ficarem iguais.
 */
export function ProfilePhotoButton({ size = 'lg', className }: { size?: keyof typeof PHOTO_SIZE; className?: string }) {
  const { data } = useData()
  const name = useDisplayName()
  const picker = useAvatarPicker()
  const s = PHOTO_SIZE[size]
  return (
    <>
      {picker.input}
      <button
        type="button"
        onClick={picker.choose}
        disabled={picker.busy}
        className={cn(
          'group relative flex shrink-0 rounded-full ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-text',
          s.ring,
          className,
        )}
        aria-label={picker.hasPhoto ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
        title={picker.hasPhoto ? 'Trocar foto' : 'Adicionar foto'}
      >
        <Avatar src={data.profile.avatar} name={name} className={s.avatar} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {picker.busy ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
          ) : (
            <Camera size={s.icon} aria-hidden />
          )}
        </span>
      </button>
    </>
  )
}
