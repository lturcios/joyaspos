import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  className?: string
}

export function DatePicker({ value, onChange, min, max, className }: DatePickerProps) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        // appearance-none suprime el estilo nativo del browser (crítico en iOS/WebKit)
        // sin esto, bg-background y text-foreground son ignorados en mobile
        'appearance-none',
        'h-9 rounded-md border border-input bg-background px-3',
        // text-base (16px) en mobile: iOS Safari hace auto-zoom si font-size < 16px
        'text-base sm:text-sm text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        // el ancho lo controla quien usa el componente vía className
        className,
      )}
    />
  )
}
