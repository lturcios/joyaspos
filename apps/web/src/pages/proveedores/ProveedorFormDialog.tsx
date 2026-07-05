import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { proveedorSchema, type ProveedorFormValues } from '@/lib/schemas'
import { useCreateProveedor, useUpdateProveedor } from '@/hooks/useProveedores'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/shared/FormField'
import type { Proveedor } from '@joyaspos/shared-types'

interface Props {
  open: boolean
  onClose: () => void
  proveedor?: Proveedor
}

export function ProveedorFormDialog({ open, onClose, proveedor }: Props) {
  const isEditing = Boolean(proveedor)
  const createMutation = useCreateProveedor()
  const updateMutation = useUpdateProveedor()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: proveedor
      ? {
          nombre: proveedor.nombre,
          contacto: proveedor.contacto ?? '',
          telefono: proveedor.telefono ?? '',
          direccion: proveedor.direccion ?? '',
        }
      : { nombre: '', contacto: '', telefono: '', direccion: '' },
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: ProveedorFormValues) => {
    try {
      if (isEditing && proveedor) {
        await updateMutation.mutateAsync({ id: proveedor.id, body: data })
        toast.success('Proveedor actualizado')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Proveedor creado')
      }
      handleClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al guardar el proveedor')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            id="nombre"
            label="Nombre *"
            error={errors.nombre}
            {...register('nombre')}
          />
          <FormField
            id="contacto"
            label="Contacto"
            placeholder="Nombre de contacto"
            error={errors.contacto}
            {...register('contacto')}
          />
          <FormField
            id="telefono"
            label="Teléfono"
            placeholder="ej: 7800-0000"
            error={errors.telefono}
            {...register('telefono')}
          />
          <FormField
            id="direccion"
            label="Dirección"
            placeholder="Dirección del proveedor"
            error={errors.direccion}
            {...register('direccion')}
          />

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
