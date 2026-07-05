import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Sheet, SheetContent } from '@/components/ui/sheet'

/**
 * Shell principal de la app.
 * Desktop (>=1024px): sidebar fijo a la izquierda, siempre visible.
 * Mobile/Tablet (<1024px): sidebar oculto; se abre como drawer (Sheet)
 * desde el boton hamburguesa del Header.
 */
export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar fijo — solo desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Sidebar como drawer — solo mobile/tablet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
