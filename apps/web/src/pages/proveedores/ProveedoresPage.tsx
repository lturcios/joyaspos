import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, MoreHorizontal } from 'lucide-react'
import { useProveedores, useDesactivarProveedor } from '@/hooks/useProveedores'
import { ProveedorFormDialog } from './ProveedorFormDialog'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Proveedor } from '@joyaspos/shared-types'

export default function ProveedoresPage() {
  const { data: proveedores, isLoading, isError, refetch } = useProveedores()
  const desactivarMutation = useDesactivarProveedor()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | undefined>()

  const handleEdit = (proveedor: Proveedor) => {
    setSelectedProveedor(proveedor)
    setDialogOpen(true)
  }

  const handleNew = () => {
    setSelectedProveedor(undefined)
    setDialogOpen(true)
  }

  const handleDesactivar = async (proveedor: Proveedor) => {
    try {
      await desactivarMutation.mutateAsync(proveedor.id)
      toast.success('Proveedor desactivado')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al desactivar')
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState message="Error al cargar proveedores" onRetry={refetch} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo proveedor
        </Button>
      </div>

      {!proveedores?.length ? (
        <EmptyState message="No hay proveedores registrados" />
      ) : (
        <>
          {/* Tabla — md+ */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.map((proveedor) => (
                  <TableRow key={proveedor.id}>
                    <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                    <TableCell>{proveedor.contacto ?? '—'}</TableCell>
                    <TableCell>{proveedor.telefono ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={proveedor.activo ? 'default' : 'secondary'}>
                        {proveedor.activo ? 'Activo' : 'Inactivo'}
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
                          <DropdownMenuItem onClick={() => handleEdit(proveedor)}>
                            Editar
                          </DropdownMenuItem>
                          {proveedor.activo && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDesactivar(proveedor)}
                            >
                              Desactivar
                            </DropdownMenuItem>
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
            {proveedores.map((proveedor) => (
              <div key={proveedor.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="font-medium truncate">{proveedor.nombre}</p>
                    <Badge variant={proveedor.activo ? 'default' : 'secondary'} className="shrink-0">
                      {proveedor.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 -mt-1 -mr-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(proveedor)}>
                        Editar
                      </DropdownMenuItem>
                      {proveedor.activo && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDesactivar(proveedor)}
                        >
                          Desactivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-1.5 space-y-0.5 text-sm text-muted-foreground">
                  {proveedor.contacto && <p>Contacto: {proveedor.contacto}</p>}
                  {proveedor.telefono && <p>Tel: {proveedor.telefono}</p>}
                  {!proveedor.contacto && !proveedor.telefono && (
                    <p className="italic">Sin datos de contacto</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ProveedorFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        proveedor={selectedProveedor}
      />
    </div>
  )
}
