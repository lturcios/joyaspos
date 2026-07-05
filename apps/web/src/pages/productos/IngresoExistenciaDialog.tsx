import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ingresoExistenciaSchema, type IngresoExistenciaValues } from '@/lib/schemas'
import { useIngresoExistencia } from '@/hooks/useProductos'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/shared/FormField'
import type { Producto } from '@joyaspos/shared-types'

interface Props {
  open: boolean
  onClose: () => void
  producto: Producto | undefined
}

export function IngresoExistenciaDialog({ open, onClose, producto }: Props) {
  const ingresoMutation = useIngresoExistencia()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IngresoExistenciaValues>({
    resolver: zodResolver(ingresoExistenciaSchema),
    defaultValues: { cantidad: 1 },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: IngresoExistenciaValues) => {
    if (!producto) return
    try {
      await ingresoMutation.mutateAsync({ id: producto.id, body: { cantidad: data.cantidad } })
      toast.success(`Ingreso registrado: +${data.cantidad} unidades`)
      handleClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al registrar ingreso')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ingreso de existencia</DialogTitle>
        </DialogHeader>

        {producto && (
          <p className="text-sm text-muted-foreground">
            Ingresando unidades de <strong>{producto.nombre}</strong> (stock actual:{' '}
            <strong>{producto.existencia}</strong>)
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            id="cantidad"
            label="Cantidad a ingresar *"
            type="number"
            min={1}
            error={errors.cantidad}
            {...register('cantidad', { valueAsNumber: true })}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={ingresoMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={ingresoMutation.isPending}>
              {ingresoMutation.isPending ? 'Guardando...' : 'Confirmar ingreso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
