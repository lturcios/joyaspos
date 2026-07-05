---
name: kpi-cards-dashboard
description: |
  Implementa el componente KpiCard reutilizable y el DashboardPage completo del
  panel web de JoyasPOS: tarjetas con valor, título y delta porcentual (flecha ↑
  verde / ↓ rojo), skeleton loaders durante carga, alerta de stock bajo, y el
  layout completo del dashboard con gráfica de ventas semanales, top 5 productos
  del día y KPIs de compras. Usar al implementar el dashboard, al agregar una
  tarjeta KPI nueva en cualquier página de reporte, o como referencia del código
  de color correcto para márgenes y deltas. Depende de SKILL-21 (react-project-structure),
  SKILL-23 (tanstack-query-axios) y SKILL-26 (recharts-reportes).
---

# SKILL-27 — KPI Cards + Dashboard (apps/web)

## Código de color del proyecto

| Situación | Color | Clase Tailwind |
|---|---|---|
| Positivo / OK / margen > 30% | Verde | `text-green-600` / `#16A34A` |
| Alerta / margen 10-30% / stock ≤ 15 | Amarillo | `text-amber-600` / `#D97706` |
| Crítico / margen < 10% / stock ≤ 5 | Rojo | `text-red-600` / `#DC2626` |
| Delta positivo (↑) | Verde | `text-green-600` |
| Delta negativo (↓) | Rojo | `text-red-600` |

---

## 1. Componente KpiCard

```tsx
// src/components/shared/KpiCard.tsx
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string              // Valor formateado (ej: "$1,234.56" o "42")
  delta?: number             // Delta % vs período anterior (positivo = bueno)
  subtitle?: string          // Texto secundario bajo el valor
  loading?: boolean
  className?: string
}

/**
 * Tarjeta de KPI reutilizable.
 * Si delta > 0: flecha verde ↑
 * Si delta < 0: flecha roja ↓
 * Si delta = 0 o undefined: sin indicador
 */
export function KpiCard({
  title, value, delta, subtitle, loading = false, className,
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-1 h-3 w-16" />
        </CardContent>
      </Card>
    )
  }

  const hasDelta = delta !== undefined && delta !== 0
  const isPositive = (delta ?? 0) > 0
  const deltaAbs = Math.abs(delta ?? 0).toFixed(1)

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>

        <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>

        {/* Delta vs período anterior */}
        {hasDelta && (
          <div
            className={cn(
              'mt-1 flex items-center gap-1 text-sm font-medium',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>
              {isPositive ? '+' : '-'}{deltaAbs}% vs ayer
            </span>
          </div>
        )}

        {/* Sin delta */}
        {!hasDelta && delta === 0 && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Minus className="h-4 w-4" />
            <span>Sin cambio</span>
          </div>
        )}

        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 2. Componente StockAlertBanner

```tsx
// src/components/shared/StockAlertBanner.tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface StockItem {
  id: number
  nombre: string
  existencia: number
}

interface StockAlertBannerProps {
  items: StockItem[]
}

/**
 * Alerta visible en el dashboard cuando hay productos con stock ≤ 5.
 * Solo se muestra si hay al menos un producto en estado crítico.
 */
export function StockAlertBanner({ items }: StockAlertBannerProps) {
  if (items.length === 0) return null

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Stock crítico — {items.length} producto(s)</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-inside list-disc text-sm">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              <strong>{item.nombre}</strong> — {item.existencia} unidades restantes
            </li>
          ))}
          {items.length > 5 && (
            <li className="text-muted-foreground">
              y {items.length - 5} producto(s) más...
            </li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
```

---

## 3. DashboardPage completo

```tsx
// src/pages/dashboard/DashboardPage.tsx
import { useDashboard } from '@/hooks/useReportes'
import { KpiCard } from '@/components/shared/KpiCard'
import { StockAlertBanner } from '@/components/shared/StockAlertBanner'
import { LineChartCard } from '@/components/charts/LineChartCard'
import { formatCurrency } from '@/lib/utils'

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Alerta de stock crítico */}
      {data?.productos_stock_bajo && data.productos_stock_bajo.length > 0 && (
        <StockAlertBanner items={data.productos_stock_bajo} />
      )}

      {/* KPIs principales — fila 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas hoy"
          value={formatCurrency(data?.ventas_hoy.monto ?? 0)}
          delta={data?.delta_pct}
          subtitle={`${data?.ventas_hoy.cantidad ?? 0} transacciones`}
          loading={isLoading}
        />
        <KpiCard
          title="Ventas ayer"
          value={formatCurrency(data?.ventas_ayer.monto ?? 0)}
          subtitle={`${data?.ventas_ayer.cantidad ?? 0} transacciones`}
          loading={isLoading}
        />
        <KpiCard
          title="Ventas esta semana"
          value={formatCurrency(data?.ventas_semana.monto ?? 0)}
          loading={isLoading}
        />
        <KpiCard
          title="Compras esta semana"
          value={formatCurrency(data?.compras_semana.monto ?? 0)}
          subtitle={`${data?.compras_semana.cantidad ?? 0} órdenes`}
          loading={isLoading}
        />
      </div>

      {/* Gráfica de ventas semanales */}
      <LineChartCard
        title="Ventas por día — esta semana"
        data={data?.ventas_semana.por_dia ?? []}
        series={[{ dataKey: 'monto', name: 'Ventas', formatAsCurrency: true }]}
        height={260}
      />

      {/* Top productos del día */}
      {data?.top_productos_hoy && data.top_productos_hoy.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Top productos hoy</h2>
          </div>
          <div className="divide-y">
            {data.top_productos_hoy.slice(0, 5).map((p, i) => (
              <div key={p.producto_id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground">
                    #{i + 1}
                  </span>
                  <span className="text-sm font-medium">{p.nombre}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(p.monto_total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.porcentaje_del_total.toFixed(1)}% del total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 4. Uso de KpiCard en páginas de reporte

```tsx
// Ejemplo en ReporteRentabilidadPage.tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
  <KpiCard
    title="Ingresos totales"
    value={formatCurrency(data?.productos.reduce((a, p) => a + p.ingresos, 0) ?? 0)}
  />
  <KpiCard
    title="Costos totales"
    value={formatCurrency(data?.productos.reduce((a, p) => a + p.costos, 0) ?? 0)}
  />
  <KpiCard
    title="Margen promedio"
    value={`${data?.margen_promedio_pct.toFixed(1) ?? 0}%`}
    // El delta aquí sería comparativa vs período anterior (extensión futura)
  />
</div>
```

---

## 5. Reglas

1. **`loading={isLoading}`** siempre en `KpiCard` — muestra skeletons automáticamente.
2. **El `delta` en el dashboard** viene directamente del endpoint `GET /reportes/dashboard` como `delta_pct` — no calcularlo en el cliente.
3. **`StockAlertBanner` solo aparece** cuando `productos_stock_bajo.length > 0` — nunca mostrar una alerta vacía.
4. **`useDashboard()` tiene `refetchInterval: 5 min`** (definido en SKILL-23) — el dashboard se autoactualiza sin recargar la página.
5. **Máximo 5 items** en el top productos del dashboard — más items afectan la legibilidad y el espacio visual.
