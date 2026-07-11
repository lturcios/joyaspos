import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, MoreHorizontal } from 'lucide-react'
import { useSucursales, useDesactivarSucursal } from '@/hooks/useSucursales'
import { SucursalFormDialog } from './SucursalFormDialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Sucursal } from '@joyaspos/shared-types'

export default function SucursalesPage() {
  const { data: sucursales, isLoading, isError, refetch } = useSucursales()
  const desactivarMutation = useDesactivarSucursal()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | undefined>()

  const handleNew = () => {
    setSelectedSucursal(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (sucursal: Sucursal) => {
    setSelectedSucursal(sucursal)
    setDialogOpen(true)
  }

  const handleDesactivar = async (sucursal: Sucursal) => {
    if (!confirm(`¿Desactivar "${sucursal.nombre}"?`)) return
    try {
      await desactivarMutation.mutateAsync(sucursal.id)
      toast.success('Sucursal desactivada')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al desactivar')
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState message="Error al cargar sucursales" onRetry={refetch} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sucursales</h1>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva sucursal
        </Button>
      </div>

      {!sucursales?.length ? (
        <EmptyState message="No hay sucursales registradas" />
      ) : (
        <>
          {/* Table — md+ */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sucursales.map((sucursal) => (
                  <TableRow key={sucursal.id}>
                    <TableCell className="font-medium">{sucursal.nombre}</TableCell>
                    <TableCell>{sucursal.direccion ?? '—'}</TableCell>
                    <TableCell>{sucursal.telefono ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={sucursal.activo ? 'default' : 'secondary'}>
                        {sucursal.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(sucursal)}>
                            Editar
                          </DropdownMenuItem>
                          {sucursal.activo && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDesactivar(sucursal)}
                              >
                                Desactivar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards — < md */}
          <div className="md:hidden space-y-2">
            {sucursales.map((sucursal) => (
              <div key={sucursal.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{sucursal.nombre}</p>
                    {sucursal.direccion && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {sucursal.direccion}
                      </p>
                    )}
                    {sucursal.telefono && (
                      <p className="text-xs text-muted-foreground mt-0.5">{sucursal.telefono}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 -mt-1 -mr-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(sucursal)}>
                        Editar
                      </DropdownMenuItem>
                      {sucursal.activo && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDesactivar(sucursal)}
                          >
                            Desactivar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-2">
                  <Badge variant={sucursal.activo ? 'default' : 'secondary'}>
                    {sucursal.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <SucursalFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        sucursal={selectedSucursal}
      />
    </div>
  )
}
