import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { sucursalSchema, type SucursalFormValues } from '@/lib/schemas'
import { useCreateSucursal, useUpdateSucursal } from '@/hooks/useSucursales'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/shared/FormField'
import type { Sucursal } from '@joyaspos/shared-types'

interface Props {
  open: boolean
  onClose: () => void
  sucursal?: Sucursal
}

export function SucursalFormDialog({ open, onClose, sucursal }: Props) {
  const isEditing = Boolean(sucursal)
  const createMutation = useCreateSucursal()
  const updateMutation = useUpdateSucursal()
  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SucursalFormValues>({
    resolver: zodResolver(sucursalSchema),
    defaultValues: {
      nombre: sucursal?.nombre ?? '',
      direccion: sucursal?.direccion ?? '',
      telefono: sucursal?.telefono ?? '',
    },
  })

  // Sync defaults when the dialog opens for editing a different sucursal
  useEffect(() => {
    reset({
      nombre: sucursal?.nombre ?? '',
      direccion: sucursal?.direccion ?? '',
      telefono: sucursal?.telefono ?? '',
    })
  }, [sucursal, reset])

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: SucursalFormValues) => {
    try {
      if (isEditing && sucursal) {
        await updateMutation.mutateAsync({ id: sucursal.id, body: data })
        toast.success('Sucursal actualizada')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Sucursal creada')
      }
      handleClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      toast.error(axiosErr.response?.data?.message ?? 'Error al guardar la sucursal')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            id="nombre"
            label="Nombre *"
            error={errors.nombre}
            {...register('nombre')}
          />
          <FormField
            id="direccion"
            label="Dirección"
            placeholder="Opcional"
            error={errors.direccion}
            {...register('direccion')}
          />
          <FormField
            id="telefono"
            label="Teléfono"
            placeholder="Opcional"
            error={errors.telefono}
            {...register('telefono')}
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
