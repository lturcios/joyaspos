import { useAuthStore } from '@/stores/authStore'

/**
 * Branch selector shown in the header.
 * - Admin: dropdown to pick a branch or "All branches" (null = consolidated view)
 * - Vendor: static text showing their own branch name (not interactive)
 */
export function SucursalSelector() {
  const user = useAuthStore((s) => s.user)
  const sucursales = useAuthStore((s) => s.sucursales)
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva)
  const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva)

  if (!user) return null

  if (user.rol === 'vendedor') {
    return (
      <span className="text-sm font-medium text-muted-foreground">
        {user.sucursal_nombre ?? '—'}
      </span>
    )
  }

  // Admin: interactive dropdown
  return (
    <select
      value={sucursalActiva === null ? '' : String(sucursalActiva)}
      onChange={(e) => setSucursalActiva(e.target.value === '' ? null : Number(e.target.value))}
      className="rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label="Seleccionar sucursal"
    >
      <option value="">Todas las sucursales</option>
      {sucursales.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </select>
  )
}
