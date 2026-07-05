import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, BarChart2 } from 'lucide-react'
import { useProductos, useDesactivarProducto } from '@/hooks/useProductos'
import { ProductoFormDialog } from './ProductoFormDialog'
import { KardexSheet } from '@/components/shared/KardexSheet'
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
import { cn } from '@/lib/utils'
import type { Producto } from '@joyaspos/shared-types'

const fmtCant = (n: number) => parseFloat(Number(n).toFixed(2)).toString()

function stockClass(n: number) {
  if (n <= 5) return 'font-semibold text-status-danger'
  if (n <= 15) return 'font-semibold text-status-warning'
  return ''
}

export default function ProductosPage() {
  const { data: productos, isLoading, isError, refetch } = useProductos()
  const desactivarMutation = useDesactivarProducto()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | undefined>()
  const [kardexId, setKardexId] = useState<number | null>(null)
  const [kardexNombre, setKardexNombre] = useState<string | undefined>()

  const handleEdit = (producto: Producto) => {
    setSelectedProducto(producto)
    setDialogOpen(true)
  }

  const handleNew = () => {
    setSelectedProducto(undefined)
    setDialogOpen(true)
  }

  const handleDesactivar = async (producto: Producto) => {
    if (!confirm(`¿Desactivar "${producto.nombre}"?`)) return
    try {
      await desactivarMutation.mutateAsync(producto.id)
      toast.success('Producto desactivado')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al desactivar')
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState message="Error al cargar productos" onRetry={refetch} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Productos</h1>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      {!productos?.length ? (
        <EmptyState message="No hay productos registrados" />
      ) : (
        <>
          {/* Tabla — md+ */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Existencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell className="font-medium">{producto.nombre}</TableCell>
                    <TableCell>{producto.unidad_medida}</TableCell>
                    <TableCell className="text-right">
                      <span className={stockClass(producto.existencia)}>
                        {fmtCant(producto.existencia)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={producto.activo ? 'default' : 'secondary'}>
                        {producto.activo ? 'Activo' : 'Inactivo'}
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
                          <DropdownMenuItem onClick={() => handleEdit(producto)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => { setKardexId(producto.id); setKardexNombre(producto.nombre) }}
                          >
                            <BarChart2 className="mr-2 h-4 w-4" />
                            Ver Kardex
                          </DropdownMenuItem>
                          {producto.activo && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDesactivar(producto)}
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
            {productos.map((producto) => (
              <div key={producto.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{producto.nombre}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{producto.unidad_medida}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 -mt-1 -mr-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(producto)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => { setKardexId(producto.id); setKardexNombre(producto.nombre) }}
                      >
                        <BarChart2 className="mr-2 h-4 w-4" />
                        Ver Kardex
                      </DropdownMenuItem>
                      {producto.activo && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDesactivar(producto)}
                          >
                            Desactivar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={cn('text-sm', stockClass(producto.existencia))}>
                    Stock: {fmtCant(producto.existencia)}
                  </span>
                  <Badge variant={producto.activo ? 'default' : 'secondary'}>
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ProductoFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        producto={selectedProducto}
      />

      <KardexSheet
        productoId={kardexId}
        nombreProducto={kardexNombre}
        onClose={() => setKardexId(null)}
      />
    </div>
  )
}
