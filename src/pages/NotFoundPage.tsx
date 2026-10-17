import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/ui/misc'

export function NotFoundPage() {
  return (
    <div className="mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={<Compass />}
        title="Página não encontrada"
        description="O endereço que você abriu não existe. Volte ao início para continuar."
        action={
          <Link to="/" className="text-sm font-medium text-primary-text hover:underline">
            Ir para o início
          </Link>
        }
      />
    </div>
  )
}
