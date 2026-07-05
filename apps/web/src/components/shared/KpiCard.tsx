import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string
  delta?: number
  subtitle?: string
}

export function KpiCard({ title, value, delta, subtitle }: KpiCardProps) {
  const showDelta = delta !== undefined && delta !== 0

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        {showDelta && (
          <div
            className={cn(
              'mt-2 flex items-center gap-1 text-sm font-medium',
              delta > 0 ? 'text-status-success' : 'text-status-danger',
            )}
          >
            {delta > 0 ? (
              <>
                <TrendingUp className="h-4 w-4" />
                <span>+{delta.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4" />
                <span>{delta.toFixed(1)}%</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
