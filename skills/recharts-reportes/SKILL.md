---
name: recharts-reportes
description: |
  Implementa las visualizaciones con Recharts para el módulo de reportes del panel
  web de JoyasPOS: LineChart para ventas/compras por día, BarChart horizontal para
  productos top, tooltips con formato de moneda, ejes con date-fns, ResponsiveContainer,
  y componentes de gráfica reutilizables (LineChartCard, BarChartCard). Usar al
  construir cualquier gráfica del módulo de reportes, al ajustar colores o formato
  de ejes, o al depurar gráficas vacías. Depende de SKILL-21 (react-project-structure),
  SKILL-00D (design-system) para la paleta de marca, y SKILL-23 (tanstack-query-axios)
  para los hooks de datos de reportes.
---

# SKILL-26 — Recharts Reportes (apps/web)

## Paleta de colores del proyecto

> Armonizada con SKILL-00D (design-system): la serie principal usa el dorado
> de marca en lugar de azul corporativo genérico — las gráficas deben sentirse
> parte de la misma identidad visual que el resto del panel.

```typescript
// src/components/charts/chartColors.ts
export const CHART_COLORS = {
  primary: '#A8763E',      // Dorado antiguo — serie principal (ventas)
  secondary: '#2B2622',    // Carbón cálido — serie secundaria
  success: '#16A34A',      // Verde — margen > 30%
  warning: '#D97706',      // Amarillo — margen 10-30%
  danger: '#DC2626',       // Rojo — margen < 10%
  muted: '#A89B89',        // Gris cálido para grids y ejes (tono tierra, no azulado)
  compras: '#6B4F2A',      // Marrón oscuro — líneas de compras (distingue de ventas sin chocar con la marca)
} as const

export const SERIES_COLORS = [
  '#A8763E', '#6B4F2A', '#059669', '#D97706', '#DC2626', '#7C5A35',
]
```

---

## 1. Componente LineChartCard

```tsx
// src/components/charts/LineChartCard.tsx
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { CHART_COLORS } from './chartColors'

interface LineData {
  fecha: string     // YYYY-MM-DD
  [key: string]: number | string
}

interface LineSeries {
  dataKey: string
  name: string
  color?: string
  formatAsCurrency?: boolean
}

interface LineChartCardProps {
  title: string
  data: LineData[]
  series: LineSeries[]
  height?: number
  emptyMessage?: string
}

export function LineChartCard({
  title, data, series,
  height = 300,
  emptyMessage = 'Sin datos para el período seleccionado',
}: LineChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height }}
          >
            {emptyMessage}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} opacity={0.4} />

              <XAxis
                dataKey="fecha"
                tickFormatter={(value: string) => {
                  try {
                    return format(parseISO(value), 'd MMM', { locale: es })
                  } catch { return value }
                }}
                tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tickFormatter={(value: number) =>
                  series[0]?.formatAsCurrency ? `$${value}` : String(value)
                }
                tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                tickLine={false}
                axisLine={false}
                width={60}
              />

              <Tooltip
                formatter={(value: number, name: string) => {
                  const serie = series.find((s) => s.name === name)
                  return [
                    serie?.formatAsCurrency ? formatCurrency(value) : value,
                    name,
                  ]
                }}
                labelFormatter={(label: string) => {
                  try {
                    return format(parseISO(label), "EEEE d 'de' MMMM", { locale: es })
                  } catch { return label }
                }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                }}
              />

              {series.length > 1 && <Legend />}

              {series.map((s, i) => (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name}
                  stroke={s.color ?? Object.values(CHART_COLORS)[i]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 2. Componente BarChartCard (horizontal — para productos top)

```tsx
// src/components/charts/BarChartCard.tsx
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { CHART_COLORS, SERIES_COLORS } from './chartColors'

interface BarData {
  nombre: string
  [key: string]: number | string
}

interface BarChartCardProps {
  title: string
  data: BarData[]
  dataKey: string
  nameKey?: string
  formatAsCurrency?: boolean
  height?: number
  emptyMessage?: string
}

export function BarChartCard({
  title, data, dataKey,
  nameKey = 'nombre',
  formatAsCurrency = true,
  height = 300,
  emptyMessage = 'Sin datos para el período seleccionado',
}: BarChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height }}
          >
            {emptyMessage}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke={CHART_COLORS.muted}
                opacity={0.4}
              />

              <XAxis
                type="number"
                tickFormatter={(v: number) => formatAsCurrency ? `$${v}` : String(v)}
                tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                type="category"
                dataKey={nameKey}
                tick={{ fontSize: 11, fill: '#334155' }}
                tickLine={false}
                axisLine={false}
                width={100}
                tickFormatter={(v: string) =>
                  v.length > 14 ? v.substring(0, 13) + '…' : v
                }
              />

              <Tooltip
                formatter={(value: number) => [
                  formatAsCurrency ? formatCurrency(value) : value,
                  dataKey,
                ]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                }}
              />

              <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 3. Uso en ReporteVentasPage

```tsx
// src/pages/reportes/ventas/ReporteVentasPage.tsx
import { LineChartCard } from '@/components/charts/LineChartCard'
import { PeriodFilter } from '@/components/shared/PeriodFilter'
import { usePeriodo } from '@/hooks/usePeriodo'
import { useReporteVentas } from '@/hooks/useReportes'
import { KpiCard } from '@/components/shared/KpiCard'
import { formatCurrency } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function ReporteVentasPage() {
  const { rango, onPeriodoChange } = usePeriodo('esta_semana')
  const { data, isLoading } = useReporteVentas(rango)

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reporte de Ventas</h1>
      </div>

      <PeriodFilter onChange={onPeriodoChange} defaultPeriodo="esta_semana" />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Total vendido"
          value={formatCurrency(data?.total_ventas ?? 0)}
        />
        <KpiCard
          title="Transacciones"
          value={String(data?.cantidad_transacciones ?? 0)}
        />
        <KpiCard
          title="Ticket promedio"
          value={formatCurrency(data?.ticket_promedio ?? 0)}
        />
      </div>

      {/* Gráfica de ventas por día */}
      <LineChartCard
        title="Ventas por día"
        data={data?.por_dia ?? []}
        series={[{ dataKey: 'monto', name: 'Monto', formatAsCurrency: true }]}
      />
    </div>
  )
}
```

---

## 4. Uso en ReporteProductosTopPage

```tsx
import { BarChartCard } from '@/components/charts/BarChartCard'
import { useReporteProductosTop } from '@/hooks/useReportes'

// Dentro del componente:
<BarChartCard
  title="Productos más vendidos (por monto)"
  data={data ?? []}
  dataKey="monto_total"
  nameKey="nombre"
  formatAsCurrency
/>
```

---

## 5. Reglas

1. **`ResponsiveContainer width="100%"`** siempre — nunca ancho fijo en píxeles.
2. **Tooltips con formato de moneda** en todas las gráficas de monto — usar `formatCurrency()`.
3. **Fechas en los ejes X** con `date-fns` y locale `es` — formato corto `d MMM` en el eje, formato largo en el tooltip.
4. **Estado vacío explícito** — cuando `data.length === 0`, mostrar el mensaje dentro del `Card`, no una gráfica vacía.
5. **`Cell` con `SERIES_COLORS`** en BarChart para colorear cada barra diferente y hacer el gráfico más legible visualmente.
