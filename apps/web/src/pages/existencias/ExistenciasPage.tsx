import { useState } from 'react'
import { useProductos } from '@/hooks/useProductos'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { KardexSheet } from '@/components/shared/KardexSheet'
import { Input } from '@/components/ui/input'
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
import { cn } from '@/lib/utils'
import { BarChart2 } from 'lucide-react'

const fmtCant = (n: number) => parseFloat(Number(n).toFixed(2)).toString()

function stockClass(n: number) {
  if (n <= 5) return 'text-status-danger'
  if (n <= 15) return 'text-status-warning'
  return ''
}

export default function ExistenciasPage() {
  const { data: productos, isLoading, isError, refetch } = useProductos()
  const [search, setSearch] = useState('')
  const [kardexId, setKardexId] = useState<number | null>(null)
  const [kardexNombre, setKardexNombre] = useState<string | undefined>()

  const activos = productos?.filter((p) => p.activo) ?? []
  const filtered = activos.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase()),
  )
  const lowStock = activos.filter((p) => p.existencia <= 15)

  const openKardex = (id: number, nombre: string) => {
    setKardexId(id)
    setKardexNombre(nombre)
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState message="Error al cargar existencias" onRetry={refetch} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Existencias</h1>
        {lowStock.length > 0 && (
          <Badge variant="destructive">
            {lowStock.length} producto{lowStock.length !== 1 ? 's' : ''} con stock bajo
          </Badge>
        )}
      </div>

      <Input
        placeholder="Buscar producto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {!filtered.length ? (
        <EmptyState message="No se encontraron productos" />
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
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell>{p.unidad_medida}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn('font-semibold', stockClass(p.existencia))}>
                        {fmtCant(p.existencia)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver kardex"
                        onClick={() => openKardex(p.id, p.nombre)}
                      >
                        <BarChart2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards — < md */}
          <div className="md:hidden space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.unidad_medida}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 -mt-1 -mr-1"
                    title="Ver kardex"
                    onClick={() => openKardex(p.id, p.nombre)}
                  >
                    <BarChart2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stock</span>
                  <span className={cn('font-semibold text-sm', stockClass(p.existencia))}>
                    {fmtCant(p.existencia)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <KardexSheet
        productoId={kardexId}
        nombreProducto={kardexNombre}
        onClose={() => setKardexId(null)}
      />
    </div>
  )
}
