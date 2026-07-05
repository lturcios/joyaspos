import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { productoSchema, type ProductoFormValues } from '@/lib/schemas'
import { useCreateProducto, useUpdateProducto } from '@/hooks/useProductos'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/shared/FormField'
import type { Producto } from '@joyaspos/shared-types'

interface Props {
  open: boolean
  onClose: () => void
  producto?: Producto
}

export function ProductoFormDialog({ open, onClose, producto }: Props) {
  const isEditing = Boolean(producto)
  const createMutation = useCreateProducto()
  const updateMutation = useUpdateProducto()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: producto
      ? { nombre: producto.nombre, unidad_medida: producto.unidad_medida, existencia: 0 }
      : { nombre: '', unidad_medida: '', existencia: 0 },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: ProductoFormValues) => {
    try {
      if (isEditing && producto) {
        await updateMutation.mutateAsync({
          id: producto.id,
          body: { nombre: data.nombre, unidad_medida: data.unidad_medida },
        })
        toast.success('Producto actualizado')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Producto creado')
      }
      handleClose()
    } catch (err: unknown) { // Axios error
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al guardar el producto')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            id="nombre"
            label="Nombre *"
            error={errors.nombre}
            {...register('nombre')}
          />
          <FormField
            id="unidad_medida"
            label="Unidad de medida *"
            placeholder="ej: unidad, kg, litro"
            error={errors.unidad_medida}
            {...register('unidad_medida')}
          />
          {!isEditing && (
            <FormField
              id="existencia"
              label="Existencia inicial"
              type="number"
              min={0}
              error={errors.existencia}
              {...register('existencia', { valueAsNumber: true })}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
