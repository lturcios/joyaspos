import { FieldError } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: FieldError
}

export function FormField({ label, error, className, ...props }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{label}</Label>
      <Input
        {...props}
        className={cn(error && 'border-destructive', className)}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  )
}
