---
name: tanstack-table
description: |
  Implementa tablas de datos con TanStack Table v8 en el panel web de JoyasPOS:
  columnas tipadas, paginación del lado cliente, ordenamiento por columna, renderizado
  de celdas con formato (moneda, fecha, badges), fila de totales al pie, y wrapper
  DataTable reutilizable integrado con shadcn/ui. Usar al implementar cualquier
  tabla de datos en el panel (ventas, productos, compras, usuarios, existencias,
  reportes), al agregar columnas nuevas, o como referencia de cómo definir columnas
  con celdas personalizadas. Depende de SKILL-21 (react-project-structure).
---

# SKILL-25 — TanStack Table v8 (apps/web)

## 1. Wrapper DataTable reutilizable

### `src/components/shared/DataTable.tsx`
```tsx
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageSize?: number
  footerRow?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns, data, pageSize = 15, footerRow,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize } },
  })

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  Sin registros para mostrar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {footerRow && (
          <div className="border-t bg-muted/30 px-4 py-2">{footerRow}</div>
        )}
      </div>

      {/* Paginación */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 2. Ejemplo de columnas — Ventas

```tsx
// src/pages/ventas/ventasColumns.tsx
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { VentaResumen } from '@joyaspos/shared-types'

export const ventasColumns: ColumnDef<VentaResumen>[] = [
  {
    accessorKey: 'fecha_hora',
    header: 'Fecha / Hora',
    cell: ({ row }) => formatDate(row.original.fecha_hora),
  },
  {
    accessorKey: 'nombre_cliente',
    header: 'Cliente',
  },
  {
    accessorKey: 'vendedor',
    header: 'Vendedor',
  },
  {
    accessorKey: 'monto_total',
    header: 'Total',
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.original.monto_total)}</span>
    ),
  },
]

// Uso con fila de total al pie:
// <DataTable
//   columns={ventasColumns}
//   data={ventas}
//   footerRow={
//     <div className="flex justify-between font-semibold">
//       <span>Total del período</span>
//       <span>{formatCurrency(totalPeriodo)}</span>
//     </div>
//   }
// />
```

---

## 3. Ejemplo de columnas — Productos con acciones

```tsx
// src/pages/productos/productosColumns.tsx
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, PlusCircle } from 'lucide-react'
import type { Producto } from '@joyaspos/shared-types'

interface ProductosColumnsProps {
  onEdit: (producto: Producto) => void
  onDesactivar: (id: number) => void
  onIngreso: (producto: Producto) => void
}

export function getProductosColumns({
  onEdit, onDesactivar, onIngreso,
}: ProductosColumnsProps): ColumnDef<Producto>[] {
  return [
    { accessorKey: 'id', header: 'ID', size: 60 },
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'unidad_medida', header: 'Unidad' },
    {
      accessorKey: 'existencia',
      header: 'Existencia',
      cell: ({ row }) => {
        const val = row.original.existencia
        return (
          <span className={
            val <= 5 ? 'font-bold text-red-600' :
            val <= 15 ? 'font-medium text-amber-600' :
            'text-green-700'
          }>
            {val}
          </span>
        )
      },
    },
    {
      accessorKey: 'activo',
      header: 'Estado',
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? 'default' : 'secondary'}>
          {row.original.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      id: 'acciones',
      header: 'Acciones',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onIngreso(row.original)}>
            <PlusCircle className="h-4 w-4" />
          </Button>
          {row.original.activo && (
            <Button
              variant="ghost" size="icon"
              className="text-destructive"
              onClick={() => onDesactivar(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]
}
```

---

## 4. Reglas

1. **Paginación a 15 filas por defecto** — ajustar con `pageSize` prop si la tabla lo amerita.
2. **Las acciones van en la última columna** con `id: 'acciones'` (sin `accessorKey`).
3. **El código de color de existencias** (rojo/amarillo/verde) se aplica en la celda de la columna, no en el componente padre.
4. **`footerRow`** para el total del período en tablas de ventas y compras — siempre visible aunque haya paginación.
