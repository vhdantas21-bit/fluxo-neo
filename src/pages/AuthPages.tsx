import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import { useToast } from '@/components/ui/Toast'
import { Logo } from '@/components/layout/Logo'
import { errorMessage } from '@/lib/utils'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-slide-up">
        <Logo className="mb-10 justify-center" />
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-fg-subtle">{subtitle}</p>
          {children}
        </div>
        {footer && <div className="mt-6 text-center text-sm text-fg-subtle">{footer}</div>}
      </div>
    </div>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-[13px] text-accent-text">
      {message}
    </p>
  )
}

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) return setError('Digite um email válido.')
    if (!password) return setError('Digite a senha.')
    setError(null)
    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Que bom ter você de volta. Vamos fazer acontecer."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-medium text-primary-text hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Senha" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="-mt-1 text-right">
          <Link to="/recuperar-senha" className="text-[13px] text-primary-text hover:underline">
            Esqueceu a senha?
          </Link>
        </div>
        <FormError message={error} />
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Diga como você quer ser chamado.')
    if (!EMAIL_RE.test(email)) return setError('Digite um email válido.')
    if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.')
    setError(null)
    setLoading(true)
    try {
      const { needsConfirmation } = await signUp(email.trim(), password, name.trim().slice(0, 80))
      if (needsConfirmation) setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (sent)
    return (
      <AuthLayout title="Confirme seu email" subtitle={`Enviamos um link de confirmação para ${email}.`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <MailCheck size={32} className="text-primary-text" aria-hidden />
          <p className="text-sm text-fg-muted">Abra o link do email para ativar a conta e depois entre.</p>
          <Link to="/entrar" className="text-sm font-medium text-primary-text hover:underline">
            Voltar a entrar
          </Link>
        </div>
      </AuthLayout>
    )

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Organize suas tarefas e sincronize entre dispositivos."
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="font-medium text-primary-text hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Nome" htmlFor="name">
          <Input id="name" autoComplete="name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <FormError message={error} />
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  )
}

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) return setError('Digite um email válido.')
    setError(null)
    setLoading(true)
    try {
      await sendPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle={sent ? 'Verifique sua caixa de entrada.' : 'Enviaremos um link para definir uma nova senha.'}
      footer={
        <Link to="/entrar" className="font-medium text-primary-text hover:underline">
          Voltar a entrar
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-fg-muted">
          Se existir uma conta com <strong className="text-fg">{email}</strong>, você vai receber um email com instruções em breve.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <FormError message={error} />
          <Button type="submit" variant="primary" loading={loading} className="w-full">
            Enviar link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  const { updatePassword, session } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!session)
    return (
      <AuthLayout title="Link inválido ou expirado" subtitle="Peça um novo link de recuperação.">
        <Link to="/recuperar-senha" className="text-sm font-medium text-primary-text hover:underline">
          Pedir novo link
        </Link>
      </AuthLayout>
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.')
    if (password !== confirm) return setError('As senhas não coincidem.')
    setError(null)
    setLoading(true)
    try {
      await updatePassword(password)
      toast.success('Senha atualizada.')
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Nova senha" subtitle="Escolha uma senha nova para sua conta.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Nova senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        <Field label="Confirmar senha" htmlFor="confirm">
          <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <FormError message={error} />
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          Salvar senha
        </Button>
      </form>
    </AuthLayout>
  )
}
