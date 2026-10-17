import { cn } from '@/lib/utils'

/**
 * Logótipo FLUXO NEO (triângulo com faixas azul claro, azul escuro,
 * laranja-avermelhado e núcleo preto), sobre um bloco claro para que o
 * triângulo preto continue visível no tema escuro.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1254 1254" className={cn('h-8 w-8', className)} aria-hidden>
      <rect width="1254" height="1254" rx="280" fill="#F5F5F5" />
      <g transform="translate(627 640) scale(0.78) translate(-619.5 -598)">
        <path d="M628 140 L703 255 L296 887 L128 887 Z" fill="#174CB5" />
        <path d="M736 318 L1186 1056 L1007 1056 L651 446 Z" fill="#012367" />
        <path d="M626 562 L826 887 L403 887 Z" fill="#010101" />
        <path d="M130 944 L868 944 L932 1056 L53 1056 Z" fill="#CF3102" />
      </g>
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[15px] leading-none font-bold tracking-[0.14em]">
        FLUXO<span className="ml-1.5 font-medium text-primary-text">NEO</span>
      </span>
    </span>
  )
}
