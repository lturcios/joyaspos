import { cn } from '@/lib/utils'
import { DatePicker } from './DatePicker'

type Periodo = 'hoy' | 'esta_semana' | 'esta_quincena' | 'este_mes' | 'personalizado'

interface PeriodFilterProps {
  value: Periodo
  onChange: (periodo: Periodo) => void
  desde?: string
  hasta?: string
  onDatesChange?: (desde: string, hasta: string) => void
}

const OPTIONS: { key: Periodo; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'esta_semana', label: 'Esta semana' },
  { key: 'esta_quincena', label: 'Esta quincena' },
  { key: 'este_mes', label: 'Este mes' },
  { key: 'personalizado', label: 'Personalizado' },
]

export function PeriodFilter({ value, onChange, desde, hasta, onDatesChange }: PeriodFilterProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 rounded-md border bg-muted p-1 w-fit">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              'rounded px-3 py-1.5 text-sm font-medium transition-colors',
              value === opt.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {value === 'personalizado' && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground shrink-0">Desde</label>
            <DatePicker
              value={desde ?? ''}
              onChange={(v) => onDatesChange?.(v, hasta ?? '')}
              className="flex-1 sm:flex-none sm:w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground shrink-0">Hasta</label>
            <DatePicker
              value={hasta ?? ''}
              onChange={(v) => onDatesChange?.(desde ?? '', v)}
              className="flex-1 sm:flex-none sm:w-36"
            />
          </div>
        </div>
      )}
    </div>
  )
}
