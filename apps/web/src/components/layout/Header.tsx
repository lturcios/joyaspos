import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

interface HeaderProps {
  onMenuClick: () => void
}

/**
 * Topbar — el boton hamburguesa SOLO es visible en mobile/tablet (<1024px);
 * en desktop el sidebar ya esta fijo y visible, asi que el boton no aplica.
 */
export function Header({ onMenuClick }: HeaderProps) {
  const user = useAuthStore((s) => s.user)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-serif text-lg font-semibold text-primary lg:hidden">
          JoyasPOS
        </span>
      </div>

      <span className="hidden text-sm text-muted-foreground sm:block">
        {user?.nombre_completo}
      </span>
    </header>
  )
}
