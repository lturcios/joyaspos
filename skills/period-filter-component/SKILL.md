---
name: period-filter-component
description: |
  Componente reutilizable de selector de período para el panel web de JoyasPOS:
  atajos Hoy/Esta semana/Esta quincena/Este mes más DatePicker de rango personalizado,
  lógica correcta de cálculo de fechas (especialmente la quincena), y emisión del
  rango {desde, hasta} hacia el componente padre. Usar en TODAS las páginas y
  reportes que filtren por período: ventas, compras, y los 5 reportes. El componente
  es idéntico en todas las secciones para garantizar experiencia consistente.
  La lógica de cálculo de fechas está centralizada en src/lib/periodos.ts (ver
  SKILL-21). Depende de SKILL-21 (react-project-structure).
---

# SKILL-28 — PeriodFilter Component (apps/web)

## Regla de la quincena
- Si día actual ≤ 15 → período: del 1 al 15 del mes
- Si día actual > 15 → período: del 16 al último día del mes

---

## 1. Componente PeriodFilter

### `src/components/shared/PeriodFilter.tsx`
```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { calcularPeriodo, type RangoPeriodo } from '@/lib/periodos'
import type { DateRange } from 'react-day-picker'

const ATAJOS = [
  { label: 'Hoy', key: 'hoy' },
  { label: 'Esta semana', key: 'esta_semana' },
  { label: 'Esta quincena', key: 'esta_quincena' },
  { label: 'Este mes', key: 'este_mes' },
] as const

interface PeriodFilterProps {
  onChange: (rango: RangoPeriodo) => void
  defaultPeriodo?: string
  className?: string
}

/**
 * Selector de período con atajos y rango personalizado.
 * Al montar, emite el período por defecto ('hoy') automáticamente.
 * Usar en todas las páginas que filtren por fecha.
 */
export function PeriodFilter({
  onChange,
  defaultPeriodo = 'hoy',
  className,
}: PeriodFilterProps) {
  const [selectedKey, setSelectedKey] = useState(defaultPeriodo)
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Emitir el período correcto al seleccionar un atajo
  const handleAtajoClick = (key: string) => {
    setSelectedKey(key)
    setCustomRange(undefined)
    onChange(calcularPeriodo(key))
  }

  // Emitir cuando se completa el rango personalizado (ambas fechas seleccionadas)
  const handleCustomRangeChange = (range: DateRange | undefined) => {
    setCustomRange(range)
    if (range?.from && range?.to) {
      setSelectedKey('personalizado')
      onChange(
        calcularPeriodo('personalizado', {
          desde: format(range.from, 'yyyy-MM-dd'),
          hasta: format(range.to, 'yyyy-MM-dd'),
        })
      )
      setPopoverOpen(false)
    }
  }

  const customLabel =
    customRange?.from && customRange?.to
      ? `${format(customRange.from, 'dd/MM/yy', { locale: es })} – ${format(customRange.to, 'dd/MM/yy', { locale: es })}`
      : 'Personalizado'

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Atajos */}
      {ATAJOS.map((atajo) => (
        <Button
          key={atajo.key}
          variant={selectedKey === atajo.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleAtajoClick(atajo.key)}
        >
          {atajo.label}
        </Button>
      ))}

      {/* Rango personalizado con DatePicker */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedKey === 'personalizado' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            {customLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={handleCustomRangeChange}
            locale={es}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

---

## 2. Hook para integrar PeriodFilter con TanStack Query

```tsx
// src/hooks/usePeriodo.ts
import { useState } from 'react'
import { calcularPeriodo, type RangoPeriodo } from '@/lib/periodos'

/**
 * Hook que mantiene el rango de período actual.
 * Inicializa con 'hoy' por defecto.
 *
 * Uso:
 *   const { rango, onPeriodoChange } = usePeriodo()
 *   const { data } = useVentas(rango)
 *   <PeriodFilter onChange={onPeriodoChange} />
 */
export function usePeriodo(defaultKey = 'hoy') {
  const [rango, setRango] = useState<RangoPeriodo>(() =>
    calcularPeriodo(defaultKey)
  )

  return {
    rango,
    onPeriodoChange: setRango,
  }
}
```

---

## 3. Uso completo en una página

```tsx
// Ejemplo: VentasPage.tsx
import { PeriodFilter } from '@/components/shared/PeriodFilter'
import { usePeriodo } from '@/hooks/usePeriodo'
import { useVentas } from '@/hooks/useVentas'
import { DataTable } from '@/components/shared/DataTable'
import { ventasColumns } from './ventasColumns'
import { formatCurrency } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorState } from '@/components/shared/ErrorState'
import { EmptyState } from '@/components/shared/EmptyState'

export default function VentasPage() {
  const { rango, onPeriodoChange } = usePeriodo('hoy')
  const { data: ventas, isLoading, isError, refetch } = useVentas(rango)

  const totalPeriodo = ventas?.reduce((acc, v) => acc + v.monto_total, 0) ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ventas</h1>
      </div>

      {/* Selector de período — idéntico en todas las páginas */}
      <PeriodFilter onChange={onPeriodoChange} defaultPeriodo="hoy" />

      {/* Contenido */}
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Error al cargar ventas" onRetry={refetch} />}
      {!isLoading && !isError && ventas?.length === 0 && (
        <EmptyState message="Sin ventas en el período seleccionado" />
      )}
      {ventas && ventas.length > 0 && (
        <DataTable
          columns={ventasColumns}
          data={ventas}
          footerRow={
            <div className="flex justify-between text-sm font-semibold">
              <span>{ventas.length} transacciones</span>
              <span>Total: {formatCurrency(totalPeriodo)}</span>
            </div>
          }
        />
      )}
    </div>
  )
}
```

---

## 4. Reglas

1. **`PeriodFilter` es idéntico en ventas, compras y todos los reportes** — nunca reimplementarlo por página.
2. **`usePeriodo()`** centraliza el estado del rango — no duplicar `useState<RangoPeriodo>` en cada página.
3. **El DatePicker solo se cierra** cuando ambas fechas están seleccionadas — evitar cierres accidentales.
4. **Deshabilitar fechas futuras** en el DatePicker con `disabled={{ after: new Date() }}`.
5. **La lógica de cálculo** vive en `src/lib/periodos.ts` — no duplicar en el componente.
